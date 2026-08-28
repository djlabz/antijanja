/**
 * Servidor customizado: Next.js (App Router, com Turbopack) + Socket.IO no
 * mesmo processo e na mesma porta. Ver docs/decisions.md (ADR 002) pra
 * entender por que isso foge da convenção "sem Route Handlers" do PaceOS —
 * sinalização WebRTC precisa de um canal bidirecional persistente, que
 * Server Actions/Route Handlers não oferecem.
 *
 * Roda direto com `tsx` (dev e produção), sem etapa de build separada pro
 * servidor — só o Next em si passa por `next build`.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import next from "next";
import { Server } from "socket.io";
import type {
  EventosCliente,
  EventosServidor,
  ParticipantId,
} from "./src/lib/socket-events";
import {
  definirFonteVideo,
  entrarNaSala,
  gerarNomeConvidado,
  listarParticipantes,
  marcarCompartilhando,
  nomeEmUso,
  obterFonteVideo,
  sairDaSala,
} from "./src/server/rooms";
import { extrairYoutube } from "./src/lib/youtube";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port, turbopack: true });
const handle = app.getRequestHandler();

interface DadosSocket {
  codigo?: string;
  nome?: string;
}

/**
 * Sobe um túnel gratuito do Cloudflare (mesmo "quick tunnel" sem conta do
 * `npm run share`/Docker, ver ADR 005) e avisa todo mundo conectado quando
 * descobre a URL pública. Existe porque quem hospeda a sala normalmente
 * abre `localhost` no próprio navegador — sem isso, o link gerado pelo
 * diálogo "Compartilhar sala" seria um `localhost` inútil pros amigos de
 * fora. Ver docs/decisions.md (ADR 011).
 */
function iniciarTunelCloudflare(
  io: Server<EventosCliente, EventosServidor>,
  porta: number
): void {
  const regexUrl = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
  let linkPublicoAtual: string | null = null;

  const processo = spawn(
    "npx",
    ["--yes", "cloudflared", "tunnel", "--url", `http://localhost:${porta}`, "--no-autoupdate"],
    { shell: true }
  );

  function processarSaida(dados: Buffer) {
    const texto = dados.toString();
    process.stdout.write(texto); // continua visível no terminal, como antes.
    const encontrado = texto.match(regexUrl);
    if (encontrado && encontrado[0] !== linkPublicoAtual) {
      linkPublicoAtual = encontrado[0];
      console.log(`\n> Link público (compartilhe com os amigos): ${linkPublicoAtual}\n`);
      io.emit("link:publico", linkPublicoAtual);
    }
  }

  processo.stdout.on("data", processarSaida);
  processo.stderr.on("data", processarSaida); // cloudflared imprime a URL no stderr, não no stdout.

  processo.on("exit", (codigo) => {
    console.error(`> Túnel do Cloudflare encerrou (código ${codigo}).`);
  });

  // Quem conectar depois do túnel já estabelecido também precisa saber a
  // URL — `io.emit` acima só alcança quem já estava conectado no momento.
  io.on("connection", (socket) => {
    if (linkPublicoAtual) socket.emit("link:publico", linkPublicoAtual);
  });
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server<EventosCliente, EventosServidor>(httpServer, {
    cors: { origin: true },
  });

  if (process.env.TUNNEL === "cloudflare") {
    iniciarTunelCloudflare(io, port);
  }

  io.on("connection", (socket) => {
    const dados: DadosSocket = {};

    socket.on("sala:entrar", ({ codigo, nome }, ack) => {
      const codigoNormalizado = codigo.trim().toLowerCase();
      if (!codigoNormalizado) {
        ack({ ok: false, erro: "Informe um código de sala." });
        return;
      }

      // Nome vazio = "Continuar como convidado": o servidor atribui
      // "Convidado N" com base em quem já está na sala — só ele sabe isso
      // de forma confiável (ver docs/decisions.md, ADR 014).
      let nomeFinal = nome.trim().slice(0, 30);
      if (!nomeFinal) {
        nomeFinal = gerarNomeConvidado(codigoNormalizado);
      } else if (nomeEmUso(codigoNormalizado, nomeFinal)) {
        ack({ ok: false, erro: "Esse nome já está em uso nessa sala." });
        return;
      }

      dados.codigo = codigoNormalizado;
      dados.nome = nomeFinal;
      socket.join(codigoNormalizado);

      const participantesAntes = listarParticipantes(codigoNormalizado);
      entrarNaSala(codigoNormalizado, socket.id, nomeFinal);

      ack({
        ok: true,
        euId: socket.id,
        nome: nomeFinal,
        participantes: participantesAntes,
        fonteVideo: obterFonteVideo(codigoNormalizado),
      });
      socket
        .to(codigoNormalizado)
        .emit("participante:entrou", {
          id: socket.id,
          nome: nomeFinal,
          compartilhando: false,
        });
    });

    socket.on("chat:enviar", ({ texto }) => {
      if (!dados.codigo || !dados.nome) return;
      const limpo = texto.trim().slice(0, 500);
      if (!limpo) return;
      io.to(dados.codigo).emit("chat:mensagem", {
        de: socket.id,
        nome: dados.nome,
        texto: limpo,
        em: Date.now(),
      });
    });

    socket.on("compartilhar:iniciar", () => {
      if (!dados.codigo) return;
      marcarCompartilhando(dados.codigo, socket.id, true);
      socket.to(dados.codigo).emit("compartilhar:iniciou", socket.id);
    });

    socket.on("compartilhar:parar", () => {
      if (!dados.codigo) return;
      marcarCompartilhando(dados.codigo, socket.id, false);
      socket.to(dados.codigo).emit("compartilhar:parou", socket.id);
    });

    socket.on("webrtc:sinal", ({ para, tipo, dados: payload }) => {
      const destino: ParticipantId = para;
      io.to(destino).emit("webrtc:sinal", { de: socket.id, tipo, dados: payload });
    });

    socket.on("fonte:adicionar", ({ link, qualquerUmControla }, ack) => {
      if (!dados.codigo) {
        ack({ ok: false, erro: "Entre numa sala primeiro." });
        return;
      }
      const extraido = extrairYoutube(link);
      if (!extraido) {
        ack({ ok: false, erro: "Não reconheci esse link do YouTube." });
        return;
      }
      const fonte = {
        youtubeId: extraido.id,
        ehPlaylist: extraido.ehPlaylist,
        adicionadoPor: socket.id,
        qualquerUmControla,
      };
      definirFonteVideo(dados.codigo, fonte);
      ack({ ok: true });
      io.to(dados.codigo).emit("fonte:atualizada", fonte);
    });

    socket.on("fonte:remover", () => {
      if (!dados.codigo) return;
      definirFonteVideo(dados.codigo, null);
      io.to(dados.codigo).emit("fonte:atualizada", null);
    });

    socket.on("fonte:comando", (comando) => {
      if (!dados.codigo) return;
      const fonte = obterFonteVideo(dados.codigo);
      if (!fonte) return;
      // Só quem adicionou pode controlar, a menos que "qualquer um" esteja
      // ligado — o servidor decide isso, nunca confia no cliente que manda.
      if (!fonte.qualquerUmControla && fonte.adicionadoPor !== socket.id) return;
      socket.to(dados.codigo).emit("fonte:comando", { ...comando, de: socket.id });
    });

    socket.on("disconnect", () => {
      if (!dados.codigo) return;
      sairDaSala(dados.codigo, socket.id);
      socket.to(dados.codigo).emit("participante:saiu", socket.id);
      socket.to(dados.codigo).emit("compartilhar:parou", socket.id);

      // Se só quem saiu podia controlar o vídeo, ninguém mais consegue —
      // melhor tirar de vez do que deixar um player travado pra sempre.
      const fonte = obterFonteVideo(dados.codigo);
      if (fonte && !fonte.qualquerUmControla && fonte.adicionadoPor === socket.id) {
        definirFonteVideo(dados.codigo, null);
        socket.to(dados.codigo).emit("fonte:atualizada", null);
      }
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> tela-junto rodando em http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
  });
});
