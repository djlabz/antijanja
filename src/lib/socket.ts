"use client";

import { io, type Socket } from "socket.io-client";
import type { EventosCliente, EventosServidor } from "@/lib/socket-events";

export type SocketSala = Socket<EventosServidor, EventosCliente>;

/**
 * Cria uma conexão nova. De propósito NÃO é um singleton de módulo: um
 * singleton sobrevive a Fast Refresh/Strict Mode de forma imprevisível (o
 * módulo pode ser reavaliado enquanto o efeito que criou o socket ainda não
 * rodou sua limpeza, deixando conexões órfãs disputando handshake). Cada
 * chamador (o hook `useSala`) cria a sua e fecha no cleanup do próprio efeito.
 */
export function criarSocket(): SocketSala {
  return io({ autoConnect: true });
}
