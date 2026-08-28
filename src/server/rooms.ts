/**
 * Estado das salas, guardado só em memória (Map). Não existe banco de dados
 * neste projeto de propósito: as salas são efêmeras e o processo do servidor
 * roda no PC de quem hospeda a sessão — ver docs/decisions.md (ADR 001).
 *
 * Import relativo (não `@/...`): este arquivo roda via `tsx` a partir de
 * `server.ts`, fora do bundler do Next.
 */
import type { FonteVideo, Participant, ParticipantId } from "../lib/socket-events";

interface Sala {
  codigo: string;
  participantes: Map<ParticipantId, Participant>;
  fonteVideo: FonteVideo | null;
}

const salas = new Map<string, Sala>();

function obterOuCriarSala(codigo: string): Sala {
  let sala = salas.get(codigo);
  if (!sala) {
    sala = { codigo, participantes: new Map(), fonteVideo: null };
    salas.set(codigo, sala);
  }
  return sala;
}

export function entrarNaSala(
  codigo: string,
  id: ParticipantId,
  nome: string
): Participant[] {
  const sala = obterOuCriarSala(codigo);
  sala.participantes.set(id, { id, nome, compartilhando: false });
  return [...sala.participantes.values()];
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

export function marcarCompartilhando(
  codigo: string,
  id: ParticipantId,
  compartilhando: boolean
): void {
  const sala = salas.get(codigo);
  const participante = sala?.participantes.get(id);
  if (participante) {
    participante.compartilhando = compartilhando;
  }
}

export function listarParticipantes(codigo: string): Participant[] {
  return [...(salas.get(codigo)?.participantes.values() ?? [])];
}

export function nomeEmUso(codigo: string, nome: string): boolean {
  const sala = salas.get(codigo);
  if (!sala) return false;
  const alvo = nome.trim().toLowerCase();
  return [...sala.participantes.values()].some(
    (p) => p.nome.trim().toLowerCase() === alvo
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

export function obterFonteVideo(codigo: string): FonteVideo | null {
  return salas.get(codigo)?.fonteVideo ?? null;
}

export function definirFonteVideo(codigo: string, fonte: FonteVideo | null): void {
  obterOuCriarSala(codigo).fonteVideo = fonte;
}
