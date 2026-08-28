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
import next from "next";
import { Server } from "socket.io";
import type {
  EventosCliente,
  EventosServidor,
  ParticipantId,
} from "./src/lib/socket-events";
import {
  entrarNaSala,
  listarParticipantes,
  marcarCompartilhando,
  nomeEmUso,
  sairDaSala,
} from "./src/server/rooms";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port, turbopack: true });
const handle = app.getRequestHandler();

interface DadosSocket {
  codigo?: string;
  nome?: string;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server<EventosCliente, EventosServidor>(httpServer, {
    cors: { origin: true },
  });

  io.on("connection", (socket) => {
    const dados: DadosSocket = {};

    socket.on("sala:entrar", ({ codigo, nome }, ack) => {
      const codigoNormalizado = codigo.trim().toLowerCase();
      const nomeNormalizado = nome.trim().slice(0, 30);

      if (!codigoNormalizado || !nomeNormalizado) {
        ack({ ok: false, erro: "Informe um nome e um código de sala." });
        return;
      }
      if (nomeEmUso(codigoNormalizado, nomeNormalizado)) {
        ack({ ok: false, erro: "Esse nome já está em uso nessa sala." });
        return;
      }

      dados.codigo = codigoNormalizado;
      dados.nome = nomeNormalizado;
      socket.join(codigoNormalizado);

      const participantesAntes = listarParticipantes(codigoNormalizado);
      entrarNaSala(codigoNormalizado, socket.id, nomeNormalizado);

      ack({
        ok: true,
        euId: socket.id,
        participantes: participantesAntes,
      });
      socket
        .to(codigoNormalizado)
        .emit("participante:entrou", {
          id: socket.id,
          nome: nomeNormalizado,
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

    socket.on("disconnect", () => {
      if (!dados.codigo) return;
      sairDaSala(dados.codigo, socket.id);
      socket.to(dados.codigo).emit("participante:saiu", socket.id);
      socket.to(dados.codigo).emit("compartilhar:parou", socket.id);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> tela-junto rodando em http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
  });
});
