import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UsuarioState {
  nome: string;
  hidratado: boolean;
  definirNome: (nome: string) => void;
}

/**
 * Guarda só o nome de exibição escolhido na tela inicial, pra sobreviver à
 * navegação até `/sala/[codigo]` sem precisar ir na URL. `sessionStorage`
 * porque é descartável por aba — não tem conta, não tem nada pra persistir
 * entre sessões.
 *
 * `hidratado` existe porque a leitura do `sessionStorage` só acontece depois
 * da primeira renderização no cliente (Next faz uma passada inicial "vazia"
 * pra bater com o SSR). Até `hidratado` virar `true`, `nome` pode estar
 * errado (sempre `""`) — quem decide redirecionar por falta de nome
 * (`SalaClient`) precisa esperar esse sinal antes de agir, senão expulsa até
 * quem já tinha entrado.
 */
export const useUsuarioStore = create<UsuarioState>()(
  persist(
    (set) => ({
      nome: "",
      hidratado: false,
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
      // Roda depois que o estado é lido do sessionStorage (com sucesso ou
      // não) — é o sinal de que `nome` já reflete o que estava salvo.
      onRehydrateStorage: () => () => {
        useUsuarioStore.setState({ hidratado: true });
      },
    }
  )
);
