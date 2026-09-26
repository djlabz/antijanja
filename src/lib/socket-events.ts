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
  /** Aviso local ("Fulano entrou") gerado pelo próprio cliente — nunca vem do servidor. */
  sistema?: boolean;
}

/**
 * Reações rápidas que flutuam sobre o vídeo. Lista fechada e compartilhada:
 * o servidor descarta qualquer emoji fora dela, então ninguém consegue
 * mandar texto arbitrário por esse canal.
 */
export const REACOES = ["👍", "😂", "🔥", "❤️", "😮", "👏"] as const;

export interface ReacaoRecebida {
  de: ParticipantId;
  nome: string;
  emoji: string;
}

export type SinalTipo = "offer" | "answer" | "candidate";

export interface SinalPayload {
  tipo: SinalTipo;
  dados: unknown;
}

/**
 * Um vídeo/playlist do YouTube compartilhado com a sala inteira — não é
 * compartilhamento de tela, é um player sincronizado (ver docs/decisions.md,
 * ADR 015). Só uma fonte ativa por sala de cada vez, por simplicidade.
 */
export interface FonteVideo {
  youtubeId: string;
  ehPlaylist: boolean;
  adicionadoPor: ParticipantId;
  /** Se falso, só quem adicionou pode dar play/pause/trocar o vídeo. */
  qualquerUmControla: boolean;
}

/**
 * Comandos de controle do player, retransmitidos pelo servidor sem
 * interpretar (quem manda é sempre quem tem permissão de controlar — ver
 * `fonte:comando` nos eventos abaixo). `sincronizar` é um "heartbeat"
 * periódico de quem controla, pra corrigir desvio de quem só assiste.
 */
export type ComandoVideo =
  | { tipo: "tocar"; emSegundos: number }
  | { tipo: "pausar"; emSegundos: number }
  | { tipo: "sincronizar"; emSegundos: number; tocando: boolean }
  | { tipo: "carregar"; youtubeId: string; ehPlaylist: boolean };

/** Eventos emitidos pelo cliente para o servidor. */
export interface EventosCliente {
  "sala:entrar": (
    // `nome` vazio pede pro servidor atribuir um nome de convidado
    // ("Convidado 1", "Convidado 2"...) — ver docs/decisions.md (ADR 014).
    payload: { codigo: string; nome: string },
    ack: (
      resposta:
        | {
            ok: true;
            euId: ParticipantId;
            nome: string;
            participantes: Participant[];
            fonteVideo: FonteVideo | null;
          }
        | { ok: false; erro: string }
    ) => void
  ) => void;
  "chat:enviar": (payload: { texto: string }) => void;
  "reacao:enviar": (emoji: string) => void;
  "compartilhar:iniciar": () => void;
  "compartilhar:parar": () => void;
  "webrtc:sinal": (payload: SinalPayload & { para: ParticipantId }) => void;
  "fonte:adicionar": (
    payload: { link: string; qualquerUmControla: boolean },
    ack: (resposta: { ok: true } | { ok: false; erro: string }) => void
  ) => void;
  "fonte:remover": () => void;
  "fonte:comando": (comando: ComandoVideo) => void;
}

/** Eventos emitidos pelo servidor para o cliente. */
export interface EventosServidor {
  "participante:entrou": (participante: Participant) => void;
  "participante:saiu": (id: ParticipantId) => void;
  "chat:mensagem": (mensagem: ChatMessage) => void;
  "reacao:recebida": (reacao: ReacaoRecebida) => void;
  "compartilhar:iniciou": (id: ParticipantId) => void;
  "compartilhar:parou": (id: ParticipantId) => void;
  "webrtc:sinal": (payload: SinalPayload & { de: ParticipantId }) => void;
  /**
   * URL pública do túnel do Cloudflare, quando o servidor sobe com um
   * (`npm run share` ou Docker com `TUNNEL=cloudflare`) — mandado assim que
   * descoberto e de novo pra cada socket que conectar depois. Existe pra
   * quem hospeda a sala mas abriu o navegador em `localhost` conseguir um
   * link de convite que funciona pros amigos (ver docs/decisions.md, ADR 011).
   */
  "link:publico": (url: string) => void;
  "fonte:atualizada": (fonte: FonteVideo | null) => void;
  "fonte:comando": (comando: ComandoVideo & { de: ParticipantId }) => void;
}
