/**
 * Estado das salas, guardado só em memória (Map). Não existe banco de dados
 * neste projeto de propósito: as salas são efêmeras e o processo do servidor
 * roda no PC de quem hospeda a sessão — ver docs/decisions.md (ADR 001).
 *
 * Import relativo (não `@/...`): este arquivo roda via `tsx` a partir de
 * `server.ts`, fora do bundler do Next.
 */
import type { ChatMessage, FonteVideo, Participant, ParticipantId } from "../lib/socket-events";

/** Quantas mensagens do chat a sala guarda pra quem entra depois (só em memória). */
export const MAX_HISTORICO = 50;

/**
 * `sessao` identifica a PESSOA (uma aba do navegador), não a conexão: o
 * socket id muda a cada reconexão, a sessão não. É o que permite reconhecer
 * "sou eu voltando" em vez de recusar o meu próprio nome (ADR 025). Nunca sai
 * do servidor — `Participant` (o que vai pros outros) não a carrega.
 */
interface Registro extends Participant {
  sessao: string;
}

interface Sala {
  codigo: string;
  participantes: Map<ParticipantId, Registro>;
  fonteVideo: FonteVideo | null;
  /** Trancada: ninguém novo entra (quem já está, ou volta de uma queda, sim). */
  trancada: boolean;
  /** As últimas mensagens, com a sessão de quem escreveu (pra reconhecer as minhas). */
  historico: { mensagem: ChatMessage; sessao: string }[];
  ultimoIdMensagem: number;
}

const salas = new Map<string, Sala>();

function obterOuCriarSala(codigo: string): Sala {
  let sala = salas.get(codigo);
  if (!sala) {
    sala = {
      codigo,
      participantes: new Map(),
      fonteVideo: null,
      trancada: false,
      historico: [],
      ultimoIdMensagem: 0,
    };
    salas.set(codigo, sala);
  }
  return sala;
}

function publico({ id, nome, compartilhando }: Registro): Participant {
  return { id, nome, compartilhando };
}

export function entrarNaSala(
  codigo: string,
  id: ParticipantId,
  nome: string,
  sessao: string
): void {
  obterOuCriarSala(codigo).participantes.set(id, {
    id,
    nome,
    compartilhando: false,
    sessao,
  });
}

/** Remove o participante e apaga a sala (com sua fonte de vídeo) se ela ficar vazia. */
export function sairDaSala(codigo: string, id: ParticipantId): void {
  const sala = salas.get(codigo);
  if (!sala) return;
  sala.participantes.delete(id);
  if (sala.participantes.size === 0) {
    salas.delete(codigo);
  }
}

export function estaNaSala(codigo: string, id: ParticipantId): boolean {
  return salas.get(codigo)?.participantes.has(id) ?? false;
}

/**
 * Quem já está na sala com essa sessão, se houver — é a conexão ANTIGA da
 * mesma pessoa (rede caiu, tela bloqueou) que o servidor ainda não percebeu
 * que morreu.
 */
export function encontrarPorSessao(
  codigo: string,
  sessao: string
): Participant | null {
  if (!sessao) return null;
  for (const p of salas.get(codigo)?.participantes.values() ?? []) {
    if (p.sessao === sessao) return publico(p);
  }
  return null;
}

export function marcarCompartilhando(
  codigo: string,
  id: ParticipantId,
  compartilhando: boolean
): void {
  const participante = salas.get(codigo)?.participantes.get(id);
  if (participante) {
    participante.compartilhando = compartilhando;
  }
}

export function listarParticipantes(codigo: string): Participant[] {
  return [...(salas.get(codigo)?.participantes.values() ?? [])].map(publico);
}

/** `ignorarId`: a própria conexão antiga de quem está reentrando não conta. */
export function nomeEmUso(
  codigo: string,
  nome: string,
  ignorarId?: ParticipantId
): boolean {
  const sala = salas.get(codigo);
  if (!sala) return false;
  const alvo = nome.trim().toLowerCase();
  return [...sala.participantes.values()].some(
    (p) => p.id !== ignorarId && p.nome.trim().toLowerCase() === alvo
  );
}

/**
 * Nome pra quem entra sem digitar nada ("Continuar como convidado") — conta
 * quantos "Convidado N" já existem na sala e numera o próximo. Reinicia se
 * todo mundo sair (a sala em si é apagada), não é um contador global.
 */
export function gerarNomeConvidado(codigo: string): string {
  const existentes = listarParticipantes(codigo).filter((p) =>
    /^convidado( \d+)?$/i.test(p.nome.trim())
  );
  return `Convidado ${existentes.length + 1}`;
}

export function salaTrancada(codigo: string): boolean {
  return salas.get(codigo)?.trancada ?? false;
}

export function trancarSala(codigo: string, trancada: boolean): void {
  const sala = salas.get(codigo);
  if (sala) sala.trancada = trancada;
}

export function obterFonteVideo(codigo: string): FonteVideo | null {
  return salas.get(codigo)?.fonteVideo ?? null;
}

export function definirFonteVideo(codigo: string, fonte: FonteVideo | null): void {
  obterOuCriarSala(codigo).fonteVideo = fonte;
}

/** Numera a mensagem, guarda no histórico da sala (as últimas `MAX_HISTORICO`) e devolve ela pronta pra mandar. */
export function registrarMensagem(
  codigo: string,
  sessao: string,
  dados: Omit<ChatMessage, "id">
): ChatMessage {
  const sala = obterOuCriarSala(codigo);
  const mensagem: ChatMessage = { id: ++sala.ultimoIdMensagem, ...dados };
  sala.historico.push({ mensagem, sessao });
  if (sala.historico.length > MAX_HISTORICO) sala.historico.shift();
  return mensagem;
}

/**
 * O histórico pra quem está entrando agora. As mensagens que a MESMA pessoa
 * (mesma sessão) escreveu antes de uma queda voltam com `de` = o id novo dela,
 * senão apareceriam como "de outra pessoa" depois de reconectar.
 */
export function historicoPara(
  codigo: string,
  meuId: ParticipantId,
  minhaSessao: string
): ChatMessage[] {
  return (salas.get(codigo)?.historico ?? []).map(({ mensagem, sessao }) =>
    minhaSessao && sessao === minhaSessao ? { ...mensagem, de: meuId } : { ...mensagem }
  );
}

