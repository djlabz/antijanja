/**
 * Todos os handlers Socket.IO da sala (entrar, chat, reações, sinalização
 * WebRTC, vídeo do YouTube). Mora fora de `server.ts` pra poder ser testado
 * sem subir o Next (ver `tests/sinalizacao.test.ts`).
 *
 * Regra de ouro: NADA que chega do navegador é confiável. Um cliente
 * malicioso (ou um console aberto) pode mandar qualquer coisa em qualquer
 * evento — número onde se espera texto, objeto vazio, `undefined` no lugar do
 * ack. Antes de ADR 025 um `{codigo: 1}` derrubava o processo inteiro (e a
 * sala de todo mundo). Por isso: todo payload entra como `unknown`, é validado
 * à mão, e cada handler roda dentro de um `try/catch` (`seguro`).
 *
 * Import relativo (não `@/...`): roda via `tsx`, fora do bundler do Next.
 */
import type { Server } from "socket.io";
import type {
  ComandoVideo,
  EventosCliente,
  EventosServidor,
  FonteVideo,
  IceServerConfig,
  ParticipantId,
  SinalOrigem,
  SinalTipo,
} from "../lib/socket-events";
import { REACOES } from "../lib/socket-events";
import { extrairYoutube, ID_YOUTUBE_VALIDO } from "../lib/youtube";
import {
  definirFonteVideo,
  encontrarPorSessao,
  entrarNaSala,
  estaNaSala,
  gerarNomeConvidado,
  listarParticipantes,
  marcarCompartilhando,
  nomeEmUso,
  obterFonteVideo,
  sairDaSala,
} from "./rooms";

export type ServidorSala = Server<EventosCliente, EventosServidor>;

/**
 * TURN opcional de quem hospeda: `TURN_URL` (uma ou várias, separadas por
 * vírgula), `TURN_USERNAME` e `TURN_CREDENTIAL`. É lido a cada entrada na
 * sala (não no boot) e mandado pro cliente no ack — dá pra ligar sem rebuild.
 */
export function lerIceServersDoAmbiente(
  ambiente: Record<string, string | undefined> = process.env
): IceServerConfig[] {
  const urls = (ambiente.TURN_URL ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter((u) => /^turns?:/i.test(u));
  if (urls.length === 0) return [];
  return [
    {
      urls,
      username: ambiente.TURN_USERNAME || undefined,
      credential: ambiente.TURN_CREDENTIAL || undefined,
    },
  ];
}

type RespostaEntrada = Parameters<Parameters<EventosCliente["sala:entrar"]>[1]>[0];
type RespostaFonte = Parameters<Parameters<EventosCliente["fonte:adicionar"]>[1]>[0];

const MAX_CODIGO = 40;
const MAX_NOME = 30;
const MAX_TEXTO_CHAT = 500;
const MAX_LINK = 300;
const TIPOS_SINAL: readonly SinalTipo[] = ["offer", "answer", "candidate"];
const ORIGENS_SINAL: readonly SinalOrigem[] = ["saida", "entrada"];

interface DadosSocket {
  codigo?: string;
  nome?: string;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

/** Executa o handler sem nunca deixar uma exceção derrubar o processo. */
function seguro<A extends unknown[]>(handler: (...args: A) => void) {
  return (...args: A) => {
    try {
      handler(...args);
    } catch (erro) {
      console.error("> erro num evento do socket (ignorado):", erro);
    }
  };
}

/** Janela deslizante: devolve `false` quando passou de `maximo` na `janelaMs`. */
function criarLimitador(maximo: number, janelaMs: number) {
  const marcas: number[] = [];
  return () => {
    const agora = Date.now();
    while (marcas.length && agora - marcas[0] > janelaMs) marcas.shift();
    if (marcas.length >= maximo) return false;
    marcas.push(agora);
    return true;
  };
}

/** Reconstrói o comando só com campos validados — nada do que veio passa direto. */
function lerComando(valor: unknown): ComandoVideo | null {
  if (!ehObjeto(valor)) return null;
  const tipo = valor.tipo;
  const segundos =
    typeof valor.emSegundos === "number" && Number.isFinite(valor.emSegundos)
      ? Math.max(0, valor.emSegundos)
      : null;
  switch (tipo) {
    case "tocar":
    case "pausar":
      return segundos === null ? null : { tipo, emSegundos: segundos };
    case "sincronizar":
      return segundos === null || typeof valor.tocando !== "boolean"
        ? null
        : { tipo, emSegundos: segundos, tocando: valor.tocando };
    case "carregar":
      return typeof valor.youtubeId === "string" &&
        ID_YOUTUBE_VALIDO.test(valor.youtubeId) &&
        typeof valor.ehPlaylist === "boolean"
        ? { tipo, youtubeId: valor.youtubeId, ehPlaylist: valor.ehPlaylist }
        : null;
    default:
      return null;
  }
}

/** Só quem adicionou controla o vídeo — a menos que "qualquer um" esteja ligado. */
function podeControlar(fonte: FonteVideo | null, id: ParticipantId) {
  return !!fonte && (fonte.qualquerUmControla || fonte.adicionadoPor === id);
}

export interface OpcoesSinalizacao {
  /** Onde vão os avisos de quem entra/sai (padrão: o terminal de quem hospeda). */
  log?: (mensagem: string) => void;
}

export function registrarSinalizacao(
  io: ServidorSala,
  { log = console.log }: OpcoesSinalizacao = {}
): void {
  io.on("connection", (socket) => {
    const dados: DadosSocket = {};
    const podeMandarChat = criarLimitador(8, 5000);
    const podeReagir = criarLimitador(8, 1000);

    /** Só vale se este socket de fato está numa sala (e ainda consta nela). */
    function salaAtual(): string | null {
      const { codigo } = dados;
      return codigo && estaNaSala(codigo, socket.id) ? codigo : null;
    }

    socket.on(
      "sala:entrar",
      seguro((payload: unknown, ack: unknown) => {
        const responder: (r: RespostaEntrada) => void =
          typeof ack === "function" ? (ack as (r: RespostaEntrada) => void) : () => {};

        if (!ehObjeto(payload) || typeof payload.codigo !== "string") {
          responder({ ok: false, erro: "Pedido inválido." });
          return;
        }
        if (dados.codigo) {
          responder({ ok: false, erro: "Você já está numa sala." });
          return;
        }
        const codigo = payload.codigo.trim().toLowerCase();
        if (!codigo) {
          responder({ ok: false, erro: "Informe um código de sala." });
          return;
        }
        if (codigo.length > MAX_CODIGO) {
          responder({ ok: false, erro: "Código de sala muito longo." });
          return;
        }
        const nomeDigitado = typeof payload.nome === "string" ? payload.nome : "";
        const sessao = typeof payload.sessao === "string" ? payload.sessao.slice(0, 64) : "";

        // Mesma sessão já na sala = é a MINHA conexão antiga que o servidor
        // ainda não percebeu que morreu (celular que trocou de rede ou
        // bloqueou a tela). Ela é substituída, e o nome não conta como
        // "em uso" por ela mesma (ADR 025).
        const antigo = encontrarPorSessao(codigo, sessao);

        // Nome vazio = "Continuar como convidado": o servidor atribui
        // "Convidado N" com base em quem já está na sala — só ele sabe isso
        // de forma confiável (ver docs/decisions.md, ADR 014).
        let nome = nomeDigitado.trim().slice(0, MAX_NOME);
        if (!nome) {
          nome = antigo?.nome ?? gerarNomeConvidado(codigo);
        } else if (nomeEmUso(codigo, nome, antigo?.id)) {
          responder({ ok: false, erro: "Esse nome já está em uso nessa sala." });
          return;
        }

        dados.codigo = codigo;
        dados.nome = nome;
        socket.join(codigo);

        // Primeiro registra o novo, depois remove o antigo: o contrário
        // apagaria a sala (e o vídeo do YouTube) se ele fosse o único.
        entrarNaSala(codigo, socket.id, nome, sessao);
        if (antigo) {
          const fonte = obterFonteVideo(codigo);
          if (fonte?.adicionadoPor === antigo.id) {
            definirFonteVideo(codigo, { ...fonte, adicionadoPor: socket.id });
          }
          sairDaSala(codigo, antigo.id);
          socket.to(codigo).emit("participante:saiu", antigo.id);
          socket.to(codigo).emit("compartilhar:parou", antigo.id);
          io.sockets.sockets.get(antigo.id)?.disconnect(true);
        }

        log(
          `> [sala ${codigo}] ${nome} ${antigo ? "voltou" : "entrou"} (${
            listarParticipantes(codigo).length
          } na sala)`
        );
        responder({
          ok: true,
          euId: socket.id,
          nome,
          participantes: listarParticipantes(codigo).filter((p) => p.id !== socket.id),
          fonteVideo: obterFonteVideo(codigo),
          iceServers: lerIceServersDoAmbiente(),
        });
        socket.to(codigo).emit("participante:entrou", {
          id: socket.id,
          nome,
          compartilhando: false,
        });
      })
    );

    socket.on(
      "chat:enviar",
      seguro((payload: unknown) => {
        const codigo = salaAtual();
        if (!codigo || !dados.nome || !ehObjeto(payload)) return;
        if (typeof payload.texto !== "string") return;
        const texto = payload.texto.trim().slice(0, MAX_TEXTO_CHAT);
        if (!texto || !podeMandarChat()) return;
        io.to(codigo).emit("chat:mensagem", {
          de: socket.id,
          nome: dados.nome,
          texto,
          em: Date.now(),
        });
      })
    );

    // Reações: só emojis da lista fechada, no máximo 8 por segundo por
    // pessoa — sem isso um clique automático encheria a tela de todo mundo.
    socket.on(
      "reacao:enviar",
      seguro((emoji: unknown) => {
        const codigo = salaAtual();
        if (!codigo || !dados.nome) return;
        if (typeof emoji !== "string" || !(REACOES as readonly string[]).includes(emoji)) {
          return;
        }
        if (!podeReagir()) return;
        io.to(codigo).emit("reacao:recebida", { de: socket.id, nome: dados.nome, emoji });
      })
    );

    socket.on(
      "compartilhar:iniciar",
      seguro(() => {
        const codigo = salaAtual();
        if (!codigo) return;
        marcarCompartilhando(codigo, socket.id, true);
        socket.to(codigo).emit("compartilhar:iniciou", socket.id);
      })
    );

    socket.on(
      "compartilhar:parar",
      seguro(() => {
        const codigo = salaAtual();
        if (!codigo) return;
        marcarCompartilhando(codigo, socket.id, false);
        socket.to(codigo).emit("compartilhar:parou", socket.id);
      })
    );

    // Repasse de sinalização WebRTC — só entre pessoas da MESMA sala. Sem
    // essa checagem, qualquer um mandava sinais pra qualquer socket id.
    socket.on(
      "webrtc:sinal",
      seguro((payload: unknown) => {
        const codigo = salaAtual();
        if (!codigo || !ehObjeto(payload)) return;
        const { para, tipo, dados: conteudo, origem } = payload;
        if (typeof para !== "string" || para === socket.id) return;
        if (!estaNaSala(codigo, para)) return;
        if (!TIPOS_SINAL.includes(tipo as SinalTipo)) return;
        if (origem !== undefined && !ORIGENS_SINAL.includes(origem as SinalOrigem)) return;
        if (!ehObjeto(conteudo)) return;
        io.to(para).emit("webrtc:sinal", {
          de: socket.id,
          tipo: tipo as SinalTipo,
          dados: conteudo,
          origem: origem as SinalOrigem | undefined,
        });
      })
    );

    socket.on(
      "fonte:adicionar",
      seguro((payload: unknown, ack: unknown) => {
        const responder: (r: RespostaFonte) => void =
          typeof ack === "function" ? (ack as (r: RespostaFonte) => void) : () => {};
        const codigo = salaAtual();
        if (!codigo) {
          responder({ ok: false, erro: "Entre numa sala primeiro." });
          return;
        }
        const link = ehObjeto(payload) && typeof payload.link === "string" ? payload.link : "";
        const extraido = link.length <= MAX_LINK ? extrairYoutube(link) : null;
        if (!extraido) {
          responder({ ok: false, erro: "Não reconheci esse link do YouTube." });
          return;
        }
        const fonte: FonteVideo = {
          youtubeId: extraido.id,
          ehPlaylist: extraido.ehPlaylist,
          adicionadoPor: socket.id,
          qualquerUmControla: ehObjeto(payload) && payload.qualquerUmControla === true,
        };
        definirFonteVideo(codigo, fonte);
        responder({ ok: true });
        io.to(codigo).emit("fonte:atualizada", fonte);
      })
    );

    socket.on(
      "fonte:remover",
      seguro(() => {
        const codigo = salaAtual();
        if (!codigo) return;
        // Mesma regra do controle: quem não pode dar play também não remove.
        if (!podeControlar(obterFonteVideo(codigo), socket.id)) return;
        definirFonteVideo(codigo, null);
        io.to(codigo).emit("fonte:atualizada", null);
      })
    );

    socket.on(
      "fonte:comando",
      seguro((valor: unknown) => {
        const codigo = salaAtual();
        if (!codigo) return;
        // O servidor decide quem controla, nunca confia no cliente que manda.
        if (!podeControlar(obterFonteVideo(codigo), socket.id)) return;
        const comando = lerComando(valor);
        if (!comando) return;
        socket.to(codigo).emit("fonte:comando", { ...comando, de: socket.id });
      })
    );

    socket.on(
      "disconnect",
      seguro(() => {
        // Já foi substituído por uma reconexão da mesma sessão: nada a fazer.
        const codigo = salaAtual();
        if (!codigo) return;
        sairDaSala(codigo, socket.id);
        log(
          `> [sala ${codigo}] ${dados.nome} saiu (${listarParticipantes(codigo).length} restantes)`
        );
        socket.to(codigo).emit("participante:saiu", socket.id);
        socket.to(codigo).emit("compartilhar:parou", socket.id);

        // Se só quem saiu podia controlar o vídeo, ninguém mais consegue —
        // melhor tirar de vez do que deixar um player travado pra sempre.
        const fonte = obterFonteVideo(codigo);
        if (fonte && !fonte.qualquerUmControla && fonte.adicionadoPor === socket.id) {
          definirFonteVideo(codigo, null);
          socket.to(codigo).emit("fonte:atualizada", null);
        }
      })
    );
  });
}
