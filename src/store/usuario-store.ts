import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UsuarioState {
  nome: string;
  definirNome: (nome: string) => void;
}

/**
 * Guarda o nome de exibição escolhido — só pra sobreviver a um F5 na MESMA
 * sala (`sessionStorage`, descartável por aba). Não existe mais um fluxo
 * separado na home pra digitar o nome antes de navegar: isso causava uma
 * condição de corrida real (bug achado em produção, não só teórico) — o
 * Next empacota `usuario-store.ts` numa cópia por rota, então "/" e
 * "/sala/[codigo]" tinham cada um sua PRÓPRIA instância deste store, e as
 * duas escreviam no mesmo `sessionStorage` quase ao mesmo tempo (uma
 * escrita da home podia acontecer ANTES da hidratação da home terminar,
 * gravando um estado parcial que a página da sala lia limpo, ficando presa
 * pra sempre com "sem nome"). A correção: o nome só é decidido DENTRO da
 * própria sala (`EscolherNomeSala`), na mesma árvore de componentes que vai
 * usá-lo — nunca precisa saltar de uma rota pra outra. Ver docs/decisions.md
 * (ADR 016).
 */
export const useUsuarioStore = create<UsuarioState>()(
  persist(
    (set) => ({
      nome: "",
      definirNome: (nome) => set({ nome }),
    }),
    {
      name: "tela-junto:usuario",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.sessionStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);

/**
 * `true` quando ESTA instância do store já terminou de ler o
 * `sessionStorage`. Usa a própria API do zustand-persist (`hasHydrated`/
 * `onFinishHydration`) em vez de guardar isso como um campo do estado —
 * um campo assim acabaria persistido junto com `nome` e sujeito à mesma
 * condição de corrida que motivou o ADR 016.
 */
export function useUsuarioHidratado(): boolean {
  return useSyncExternalStore(
    (aoMudar) => useUsuarioStore.persist.onFinishHydration(aoMudar),
    () => useUsuarioStore.persist.hasHydrated(),
    () => false // no servidor a hidratação nunca aconteceu — é sempre false lá.
  );
}
