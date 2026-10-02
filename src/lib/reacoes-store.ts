/**
 * Reações flutuantes fora do estado do React. Cada reação que chega mexia no
 * estado de `useSala` e re-renderizava a sala inteira (todos os vídeos
 * incluídos); numa enxurrada de emojis isso pesava. Aqui só quem desenha as
 * reações (`ReacoesFlutuantes`) assina a lista, via `useSyncExternalStore`.
 *
 * Sem imports de React: dá pra testar direto no Node.
 */

export interface ReacaoFlutuante {
  id: number;
  emoji: string;
  nome: string;
  /** Posição horizontal, em % da largura do vídeo. */
  x: number;
}

/** Quantas ficam na tela ao mesmo tempo: uma enxurrada não precisa desenhar todas. */
export const MAX_REACOES_NA_TELA = 30;
/** Quanto tempo cada uma fica (combina com a animação `reacao-flutuante` do CSS). */
export const DURACAO_REACAO_MS = 2600;

export interface ReacoesStore {
  /** A lista de agora; só troca de referência quando muda (serve de snapshot). */
  ler: () => readonly ReacaoFlutuante[];
  assinar: (aviso: () => void) => () => void;
  adicionar: (nome: string, emoji: string) => void;
  /** Cancela os timers e esvazia — ao sair da sala. */
  limpar: () => void;
}

export function criarReacoesStore(sortearX: () => number = () => 10 + Math.random() * 80): ReacoesStore {
  let lista: readonly ReacaoFlutuante[] = [];
  let contador = 0;
  const ouvintes = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  function trocar(nova: readonly ReacaoFlutuante[]) {
    lista = nova;
    ouvintes.forEach((aviso) => aviso());
  }

  return {
    ler: () => lista,
    assinar(aviso) {
      ouvintes.add(aviso);
      return () => {
        ouvintes.delete(aviso);
      };
    },
    adicionar(nome, emoji) {
      const id = ++contador;
      trocar([...lista.slice(-(MAX_REACOES_NA_TELA - 1)), { id, emoji, nome, x: sortearX() }]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        trocar(lista.filter((r) => r.id !== id));
      }, DURACAO_REACAO_MS);
      timers.add(timer);
    },
    limpar() {
      timers.forEach(clearTimeout);
      timers.clear();
      if (lista.length > 0) trocar([]);
    },
  };
}
