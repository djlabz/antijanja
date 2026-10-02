/**
 * Conexões WebRTC da sala, sem React: abre/fecha as `RTCPeerConnection`,
 * processa a sinalização e reage quando uma conexão cai. `useSala` só liga
 * isto ao socket e ao estado da tela.
 *
 * Modelo (ver docs/decisions.md, ADR 003): "mesh só do lado de quem
 * compartilha". Cada pessoa que transmite abre uma conexão de SAÍDA com cada
 * espectador; quem assiste tem uma conexão de ENTRADA por transmissor. Se os
 * dois transmitem ao mesmo tempo existem duas conexões por par, uma em cada
 * sentido — por isso todo `candidate` viaja com a `origem` (ADR 025).
 */
import { aplicarLimiteBitrate } from "@/lib/qualidade-transmissao";
import type {
  IceServerConfig,
  ParticipantId,
  SinalOrigem,
  SinalTipo,
} from "@/lib/socket-events";
import { montarConfiguracaoIce } from "@/lib/webrtc-config";

/**
 * Estado da conexão de ENTRADA (a que traz o vídeo de alguém) como a tela
 * precisa mostrar: `instavel` = caiu agora, ainda pode voltar sozinha;
 * `falhou` = desistiu (normalmente rede restrita sem TURN, ADR 003).
 */
export type EstadoConexao = "conectando" | "conectado" | "instavel" | "falhou";

export interface EstatisticasVideo {
  largura: number;
  altura: number;
  fps: number;
  bytes: number;
  /** Timestamp do relatório WebRTC, em ms. */
  em: number;
}

/** Por que o encoder está entregando menos do que podia (`qualityLimitationReason`). */
export type LimiteEnvio = "none" | "bandwidth" | "cpu" | "other";

/**
 * Como está a conexão de SAÍDA com um espectador — o que quem transmite
 * precisa pra saber se alguém está com problema (só o espectador via isso).
 */
export interface SaudeSaida {
  id: ParticipantId;
  estado: EstadoConexao;
  limite: LimiteEnvio;
  /** Total de bytes de vídeo enviados e o instante da leitura — compare duas leituras pro bitrate. */
  bytes: number;
  em: number;
  fps: number;
  altura: number;
}

/** `closed` não tem o que mostrar (a conexão está sendo descartada). */
function estadoDe(estado: RTCPeerConnectionState): EstadoConexao | null {
  switch (estado) {
    case "new":
    case "connecting":
      return "conectando";
    case "connected":
      return "conectado";
    case "disconnected":
      return "instavel";
    case "failed":
      return "falhou";
    default:
      return null;
  }
}

interface Opcoes {
  enviarSinal: (
    para: ParticipantId,
    tipo: SinalTipo,
    dados: unknown,
    origem: SinalOrigem
  ) => void;
  obterStreamLocal: () => MediaStream | null;
  obterBitrateMbps: () => number | null;
  /** TURN extra que o servidor mandou ao entrar na sala (vazio = só STUN). */
  obterIceServers: () => IceServerConfig[];
  aoReceberStream: (de: ParticipantId, stream: MediaStream) => void;
  /** `null` = a conexão de entrada foi fechada (nada mais a mostrar). */
  aoMudarEstadoEntrada: (de: ParticipantId, estado: EstadoConexao | null) => void;
}

interface Saida {
  pc: RTCPeerConnection;
  /** Quantas vezes já tentei refazer o caminho ICE desde o último "conectado". */
  reinicios: number;
  timer?: ReturnType<typeof setTimeout>;
}

/** Tentativas de ICE restart antes de desistir (cada uma é uma oferta nova). */
const MAX_REINICIOS = 3;
/** "disconnected" costuma voltar sozinho; só age se passar disso. */
const ESPERA_INSTAVEL_MS = 5000;

export function criarConexoes(opcoes: Opcoes) {
  const saida = new Map<ParticipantId, Saida>();
  const entrada = new Map<ParticipantId, RTCPeerConnection>();
  // Sinais de uma mesma pessoa são tratados um de cada vez, na ordem em que
  // chegaram. Sem isso um `candidate` encontrava a conexão ainda sem
  // `remoteDescription` (a oferta anterior ainda estava no `await`), o
  // `addIceCandidate` falhava e o candidato se perdia em silêncio.
  const filas = new Map<ParticipantId, Promise<void>>();
  let encerrado = false;

  // ---------- saída: eu transmito, o outro assiste ----------

  async function enviarOferta(para: ParticipantId, conexao: Saida, reiniciar: boolean) {
    const { pc } = conexao;
    const oferta = await pc.createOffer(reiniciar ? { iceRestart: true } : undefined);
    if (saida.get(para) !== conexao) return; // fechada enquanto negociava.
    await pc.setLocalDescription(oferta);
    opcoes.enviarSinal(para, "offer", oferta, "saida");
  }

  function reiniciarCaminho(para: ParticipantId, conexao: Saida) {
    if (encerrado || saida.get(para) !== conexao) return;
    if (conexao.reinicios >= MAX_REINICIOS) return;
    conexao.reinicios++;
    enviarOferta(para, conexao, true).catch(() => {});
  }

  function aoMudarEstadoSaida(para: ParticipantId, conexao: Saida) {
    if (saida.get(para) !== conexao) return;
    clearTimeout(conexao.timer);
    switch (conexao.pc.connectionState) {
      case "connected":
        conexao.reinicios = 0;
        break;
      case "disconnected":
        conexao.timer = setTimeout(() => reiniciarCaminho(para, conexao), ESPERA_INSTAVEL_MS);
        break;
      case "failed":
        reiniciarCaminho(para, conexao);
        break;
    }
  }

  /** Abre a conexão de saída com `para` e manda a oferta (minha tela → ele). */
  async function ofertar(para: ParticipantId) {
    const stream = opcoes.obterStreamLocal();
    if (!stream || encerrado) return;
    fecharSaida(para);

    const pc = new RTCPeerConnection(montarConfiguracaoIce(opcoes.obterIceServers()));
    const conexao: Saida = { pc, reinicios: 0 };
    saida.set(para, conexao);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    await aplicarLimiteBitrate(pc, opcoes.obterBitrateMbps());

    pc.onicecandidate = (evento) => {
      if (evento.candidate) opcoes.enviarSinal(para, "candidate", evento.candidate, "saida");
    };
    pc.onconnectionstatechange = () => aoMudarEstadoSaida(para, conexao);

    await enviarOferta(para, conexao, false);
  }

  function fecharSaida(id: ParticipantId) {
    const conexao = saida.get(id);
    if (!conexao) return;
    clearTimeout(conexao.timer);
    saida.delete(id);
    conexao.pc.close();
  }

  // ---------- entrada: o outro transmite, eu assisto ----------

  function criarEntrada(de: ParticipantId) {
    const pc = new RTCPeerConnection(montarConfiguracaoIce(opcoes.obterIceServers()));
    entrada.set(de, pc);
    opcoes.aoMudarEstadoEntrada(de, "conectando");

    pc.onicecandidate = (evento) => {
      if (evento.candidate) opcoes.enviarSinal(de, "candidate", evento.candidate, "entrada");
    };
    pc.ontrack = (evento) => opcoes.aoReceberStream(de, evento.streams[0]);
    pc.onconnectionstatechange = () => {
      if (entrada.get(de) !== pc) return;
      const estado = estadoDe(pc.connectionState);
      if (estado) opcoes.aoMudarEstadoEntrada(de, estado);
    };
    return pc;
  }

  function fecharEntrada(id: ParticipantId) {
    const pc = entrada.get(id);
    if (!pc) return;
    entrada.delete(id);
    pc.close();
    opcoes.aoMudarEstadoEntrada(id, null);
  }

  // ---------- sinalização ----------

  async function processar(
    de: ParticipantId,
    tipo: SinalTipo,
    dados: unknown,
    origem: SinalOrigem | undefined
  ) {
    if (encerrado) return;

    if (tipo === "offer") {
      // Já existe conexão de entrada = é um ICE restart do transmissor.
      const pc = entrada.get(de) ?? criarEntrada(de);
      await pc.setRemoteDescription(dados as RTCSessionDescriptionInit);
      const resposta = await pc.createAnswer();
      await pc.setLocalDescription(resposta);
      opcoes.enviarSinal(de, "answer", resposta, "entrada");
      return;
    }

    if (tipo === "answer") {
      await saida.get(de)?.pc.setRemoteDescription(dados as RTCSessionDescriptionInit);
      return;
    }

    // candidate: a `origem` diz de qual conexão DELE ele veio — a que ele
    // oferece (saida) fala com a minha entrada, e vice-versa. Sem `origem`
    // (cliente antigo) cai no palpite de antes.
    const pc =
      origem === "saida"
        ? entrada.get(de)
        : origem === "entrada"
          ? saida.get(de)?.pc
          : (entrada.get(de) ?? saida.get(de)?.pc);
    try {
      await pc?.addIceCandidate(dados as RTCIceCandidateInit);
    } catch {
      // candidato atrasado/inválido, sem problema — ICE segue tentando outras rotas.
    }
  }

  function tratarSinal(
    de: ParticipantId,
    tipo: SinalTipo,
    dados: unknown,
    origem?: SinalOrigem
  ): Promise<void> {
    const proxima = (filas.get(de) ?? Promise.resolve())
      .then(() => processar(de, tipo, dados, origem))
      .catch(() => {
        // Um sinal ruim não pode travar a fila nem os que vêm depois.
      });
    filas.set(de, proxima);
    return proxima;
  }

  // ---------- controle ----------

  /** A pessoa saiu: fecha tudo que havia com ela. */
  function esquecer(id: ParticipantId) {
    fecharEntrada(id);
    fecharSaida(id);
    filas.delete(id);
  }

  function fecharSaidas() {
    for (const id of [...saida.keys()]) fecharSaida(id);
  }

  /** Fecha tudo (reconexão: as conexões antigas morreram com o socket antigo). */
  function fecharTudo() {
    fecharSaidas();
    for (const id of [...entrada.keys()]) fecharEntrada(id);
    filas.clear();
  }

  function encerrar() {
    encerrado = true;
    fecharTudo();
  }

  async function aplicarBitrate(bitrateMbps: number | null) {
    for (const { pc } of saida.values()) {
      await aplicarLimiteBitrate(pc, bitrateMbps);
    }
  }

  /**
   * Foto do vídeo que estou recebendo de `id` (resolução, fps e total de
   * bytes — quem chama compara duas fotos pra achar o bitrate). Deixa quem
   * assiste diferenciar rede fraca de configuração de quem transmite (ADR 019).
   */
  async function estatisticas(id: ParticipantId): Promise<EstatisticasVideo | null> {
    const pc = entrada.get(id);
    if (!pc) return null;
    let foto: EstatisticasVideo | null = null;
    (await pc.getStats()).forEach((r) => {
      if (r.type === "inbound-rtp" && (r.kind ?? r.mediaType) === "video") {
        foto = {
          largura: r.frameWidth ?? 0,
          altura: r.frameHeight ?? 0,
          fps: r.framesPerSecond ?? 0,
          bytes: r.bytesReceived ?? 0,
          em: r.timestamp,
        };
      }
    });
    return foto;
  }

  /** Estado e vazão de cada conexão de saída (quem transmite acompanha quem recebe). */
  async function saude(): Promise<SaudeSaida[]> {
    return Promise.all(
      [...saida].map(async ([id, { pc }]) => {
        const leitura: SaudeSaida = {
          id,
          estado: estadoDe(pc.connectionState) ?? "conectando",
          limite: "none",
          bytes: 0,
          em: 0,
          fps: 0,
          altura: 0,
        };
        try {
          (await pc.getStats()).forEach((r) => {
            if (r.type === "outbound-rtp" && (r.kind ?? r.mediaType) === "video") {
              leitura.limite = (r.qualityLimitationReason as LimiteEnvio) ?? "none";
              leitura.bytes = r.bytesSent ?? 0;
              leitura.em = r.timestamp;
              leitura.fps = r.framesPerSecond ?? 0;
              leitura.altura = r.frameHeight ?? 0;
            }
          });
        } catch {
          // conexão fechando no meio da leitura — fica com o estado.
        }
        return leitura;
      })
    );
  }

  return {
    ofertar,
    tratarSinal,
    saude,
    esquecer,
    fecharEntrada,
    fecharSaidas,
    fecharTudo,
    encerrar,
    aplicarBitrate,
    estatisticas,
  };
}

export type Conexoes = ReturnType<typeof criarConexoes>;
