/**
 * Regras da lista de mensagens do chat no cliente, sem React (testável no
 * Node): limite de tamanho e como juntar o histórico que o servidor manda ao
 * entrar/reconectar com o que a tela já tem.
 */
import type { ChatMessage, ParticipantId } from "./socket-events";

/** Mensagens mantidas na tela; as mais velhas saem (o servidor guarda só 50 de qualquer jeito). */
export const MAX_MENSAGENS_NO_CLIENTE = 200;

export function anexarMensagens(atual: ChatMessage[], novas: ChatMessage[]): ChatMessage[] {
  return [...atual, ...novas].slice(-MAX_MENSAGENS_NO_CLIENTE);
}

/**
 * Junta o histórico da sala (vindo no ack de `sala:entrar`) à lista atual.
 *
 * - Primeira entrada (`euAntigo` nulo): tudo é "antigo" — foi dito antes de eu
 *   chegar, não deve apitar nem virar não lida.
 * - Reconexão: só entra o que eu ainda não tinha (ids do servidor, > 0), e isso
 *   NÃO é antigo: foi dito enquanto eu estava fora. As mensagens que escrevi
 *   com o id de socket antigo passam pro novo, senão viram "de outra pessoa".
 */
export function mesclarHistorico(
  atual: ChatMessage[],
  historico: ChatMessage[],
  { euAntigo, euNovo }: { euAntigo: ParticipantId | null; euNovo: ParticipantId }
): { lista: ChatMessage[]; adicionadas: number } {
  const base =
    euAntigo && euAntigo !== euNovo
      ? atual.map((m) => (m.de === euAntigo ? { ...m, de: euNovo } : m))
      : atual;
  const vistos = new Set(base.filter((m) => m.id > 0).map((m) => m.id));
  const novas = historico
    .filter((m) => !vistos.has(m.id))
    .map((m) => (euAntigo === null ? { ...m, antiga: true } : m));
  return { lista: anexarMensagens(base, novas), adicionadas: novas.length };
}

/**
 * As mensagens que chegaram depois de `vistas` (de um total que só cresce).
 * A lista é cortada nas últimas `MAX_MENSAGENS_NO_CLIENTE`, então "o que falta
 * ver" é uma conta de total, e o resultado nunca passa do que a lista ainda
 * tem. É a regra única do contador de não lidas e dos avisos de segundo plano.
 */
export function ultimasPendentes(
  mensagens: ChatMessage[],
  total: number,
  vistas: number
): ChatMessage[] {
  const pendentes = Math.max(0, Math.min(total - vistas, mensagens.length));
  return mensagens.slice(mensagens.length - pendentes);
}

