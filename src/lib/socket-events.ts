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

/**
 * Servidor STUN/TURN extra, definido por quem hospeda (variáveis de ambiente
 * `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`) e entregue a cada cliente
 * ao entrar na sala — assim dá pra ligar um TURN sem rebuildar o app (ADR 025).
 */
export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
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

/**
 * Qual conexão do remetente gerou o sinal: `saida` = a que ELE oferece
 * (manda a tela dele), `entrada` = a que ele responde (recebe a tela de
 * quem recebe o sinal). Só importa pra `candidate`: sem isso, quando duas
 * pessoas transmitem ao mesmo tempo (uma conexão em cada sentido), o
 * candidato podia cair na conexão errada (ADR 025).
 */
/**
 * Por que o servidor recusou a entrada, quando a tela pode fazer algo melhor
 * que "tentar de novo" (esperar não destranca uma sala; outro nome resolve
 * "em uso"). Sem `motivo` = erro genérico, só o texto.
 */
export type MotivoRecusa = "trancada" | "nome-em-uso" | "limite";

export type SinalOrigem = "saida" | "entrada";

export interface SinalPayload {
  tipo: SinalTipo;
  dados: unknown;
  origem?: SinalOrigem;
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
    // `sessao`: id aleatório da aba, igual em toda reconexão — deixa o
    // servidor reconhecer "sou eu voltando" (ADR 025).
    payload: { codigo: string; nome: string; sessao: string },
    ack: (
      resposta:
        | {
            ok: true;
            euId: ParticipantId;
            nome: string;
            participantes: Participant[];
            fonteVideo: FonteVideo | null;
            /** Servidores ICE extras (TURN) configurados no servidor; vazio = só o STUN padrão. */
            iceServers: IceServerConfig[];
            /** A sala está trancada (ninguém novo entra)? */
            trancada: boolean;
          }
        | { ok: false; erro: string; motivo?: MotivoRecusa }
    ) => void
  ) => void;
  /** Tranca/destranca a sala — qualquer pessoa dentro pode (grupo pequeno de amigos). */
  "sala:trancar": (trancar: boolean) => void;
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
  "sala:trancada": (trancada: boolean) => void;
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
