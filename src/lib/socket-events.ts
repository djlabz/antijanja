/**
 * Contrato de eventos do Socket.IO compartilhado entre cliente e servidor.
 *
 * Este arquivo não pode importar nada (nem `@/...`, nem pacotes) além de tipos
 * puros: ele é lido tanto pelo bundler do Next (via alias `@/lib/socket-events`)
 * quanto pelo `server.ts` na raiz do projeto (via import relativo, rodando fora
 * do Next através do `tsx`). Ver docs/decisions.md (ADR 002).
 */

export type ParticipantId = string;

export interface Participant {
  id: ParticipantId;
  nome: string;
  compartilhando: boolean;
}

export interface ChatMessage {
  de: ParticipantId;
  nome: string;
  texto: string;
  em: number;
}

export type SinalTipo = "offer" | "answer" | "candidate";

export interface SinalPayload {
  tipo: SinalTipo;
  dados: unknown;
}

/** Eventos emitidos pelo cliente para o servidor. */
export interface EventosCliente {
  "sala:entrar": (
    payload: { codigo: string; nome: string },
    ack: (
      resposta:
        | { ok: true; euId: ParticipantId; participantes: Participant[] }
        | { ok: false; erro: string }
    ) => void
  ) => void;
  "chat:enviar": (payload: { texto: string }) => void;
  "compartilhar:iniciar": () => void;
  "compartilhar:parar": () => void;
  "webrtc:sinal": (payload: SinalPayload & { para: ParticipantId }) => void;
}

/** Eventos emitidos pelo servidor para o cliente. */
export interface EventosServidor {
  "participante:entrou": (participante: Participant) => void;
  "participante:saiu": (id: ParticipantId) => void;
  "chat:mensagem": (mensagem: ChatMessage) => void;
  "compartilhar:iniciou": (id: ParticipantId) => void;
  "compartilhar:parou": (id: ParticipantId) => void;
  "webrtc:sinal": (payload: SinalPayload & { de: ParticipantId }) => void;
}
