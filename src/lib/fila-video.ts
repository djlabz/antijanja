/**
 * Regras da fila do player do YouTube (ADR 037) — só funções puras sobre
 * `FonteVideo`, sem socket nem DOM, pra serem testadas direto e importadas dos
 * dois lados (servidor por caminho relativo, Next por `@/lib/fila-video`).
 *
 * Toda função devolve a fonte NOVA (nunca altera a recebida) ou `null` quando
 * nada mudou — o servidor só avisa a sala quando vem uma fonte de volta.
 */
import type {
  AcaoFila,
  FonteVideo,
  ItemFila,
  ParticipantId,
} from "./socket-events";

/** Quantos vídeos cabem esperando na fila (fora o que está tocando). */
export const MAX_FILA = 50;

export const ACOES_FILA: readonly AcaoFila[] = ["avancar", "tocar", "priorizar", "remover"];

/**
 * O player chegou ao fim "de vez" — e não só ao fim de um vídeo no meio de uma
 * playlist (o YouTube avisa "terminou" a cada vídeo dela)? Sem a lista ainda
 * carregada, na dúvida NÃO conta: pular uma playlist inteira por engano é pior
 * que esperar a pessoa apertar "próximo".
 */
export function acabouODoItem(
  ehPlaylist: boolean,
  playlist: string[] | null | undefined,
  indice: number
): boolean {
  if (!ehPlaylist) return true;
  return Array.isArray(playlist) && playlist.length > 0 && indice === playlist.length - 1;
}

export function criarFonte(
  item: ItemFila,
  adicionadoPor: ParticipantId,
  qualquerUmControla: boolean
): FonteVideo {
  return { atual: item, proximos: [], adicionadoPor, qualquerUmControla };
}

/** Põe no fim da fila. `null` se ela já está cheia. */
export function adicionarNaFila(fonte: FonteVideo, item: ItemFila): FonteVideo | null {
  if (fonte.proximos.length >= MAX_FILA) return null;
  return { ...fonte, proximos: [...fonte.proximos, item] };
}

/**
 * Aplica uma ação da fila. `null` = nada a fazer (item que não existe mais,
 * já removido por outra pessoa, nada pra tocar em seguida...). É assim que dois
 * controladores mandando "avançar" ao mesmo tempo (os dois players chegam ao
 * fim do vídeo juntos) pulam UM vídeo só: o segundo cita um item que já não é
 * o atual.
 */
export function aplicarAcaoNaFila(
  fonte: FonteVideo,
  acao: AcaoFila,
  itemId: number
): FonteVideo | null {
  const indice = fonte.proximos.findIndex((item) => item.id === itemId);

  switch (acao) {
    case "avancar": {
      if (fonte.atual.id !== itemId || fonte.proximos.length === 0) return null;
      const [proximo, ...resto] = fonte.proximos;
      return { ...fonte, atual: proximo, proximos: resto };
    }
    case "tocar": {
      if (indice === -1) return null;
      return {
        ...fonte,
        atual: fonte.proximos[indice],
        proximos: fonte.proximos.filter((_, i) => i !== indice),
      };
    }
    case "priorizar": {
      if (indice <= 0) return null;
      const item = fonte.proximos[indice];
      return {
        ...fonte,
        proximos: [item, ...fonte.proximos.filter((_, i) => i !== indice)],
      };
    }
    case "remover": {
      if (indice === -1) return null;
      return { ...fonte, proximos: fonte.proximos.filter((_, i) => i !== indice) };
    }
  }
}
