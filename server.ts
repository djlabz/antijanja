/**
 * Servidor customizado: Next.js (App Router, com Turbopack) + Socket.IO no
 * mesmo processo e na mesma porta. Ver docs/decisions.md (ADR 002) pra
 * entender por que isso foge da convenção "sem Route Handlers" do PaceOS —
 * sinalização WebRTC precisa de um canal bidirecional persistente, que
 * Server Actions/Route Handlers não oferecem.
 *
 * Roda direto com `tsx` (dev e produção), sem etapa de build separada pro
 * servidor — só o Next em si passa por `next build`.
 *
 * Os handlers dos eventos da sala moram em `src/server/sinalizacao.ts`
 * (separados daqui pra serem testáveis sem subir o Next — ADR 025).
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import next from "next";
import { Server } from "socket.io";
import type { EventosCliente, EventosServidor } from "./src/lib/socket-events";
import { registrarSinalizacao } from "./src/server/sinalizacao";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

// Tempo desde que o processo começou a subir. Existe por causa de um deploy no
// Render em que a subida levou 6 minutos e a porta nunca foi detectada, sem
// nenhuma pista no log de onde o tempo foi (ADR 033): com isso o próximo
// travamento mostra se foi preparar o Next, abrir a porta ou a 1ª resposta.
const inicio = Date.now();
const desde = () => `${((Date.now() - inicio) / 1000).toFixed(1)}s`;
console.log(
  `> iniciando (node ${process.version}, NODE_ENV=${process.env.NODE_ENV ?? "?"}, porta ${port})`
);

const app = next({ dev, hostname, port, turbopack: true });
const handle = app.getRequestHandler();

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
      process.env.URL_PUBLICA = linkPublicoAtual; // lido pelo layout (prévia do link, ADR 027).
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
  console.log(`> Next preparado em ${desde()}`);

  // Só a primeira requisição (no Render, o health check): mostra quanto o app
  // demorou pra responder pela primeira vez.
  let primeira = true;
  const httpServer = createServer((req, res) => {
    if (primeira) {
      primeira = false;
      const t0 = Date.now();
      res.on("finish", () =>
        console.log(`> 1ª requisição (${req.url}) respondida ${res.statusCode} em ${Date.now() - t0}ms`)
      );
    }
    handle(req, res);
  });
  httpServer.on("error", (erro) => {
    console.error("> o servidor HTTP falhou:", erro);
    process.exit(1);
  });

  // Sem `cors`: o cliente é servido por este mesmo servidor (mesma origem),
  // então não há motivo pra deixar páginas de outros sites se conectarem.
  const io = new Server<EventosCliente, EventosServidor>(httpServer);

  if (process.env.TUNNEL === "cloudflare") {
    iniciarTunelCloudflare(io, port);
  }

  registrarSinalizacao(io);

  httpServer.listen(port, hostname, () => {
    console.log(
      `> sinal rodando em http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port} (subiu em ${desde()})`
    );
  });
}).catch((erro) => {
  console.error(`> falha ao preparar o Next depois de ${desde()}:`, erro);
  process.exit(1);
});
