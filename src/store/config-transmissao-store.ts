import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ResolucaoId } from "@/lib/qualidade-transmissao";

interface ConfigTransmissaoState {
  resolucao: ResolucaoId;
  fps: number;
  bitrateMbps: number | null;
  definirResolucao: (resolucao: ResolucaoId) => void;
  definirFps: (fps: number) => void;
  definirBitrate: (bitrateMbps: number | null) => void;
}

/**
 * Preferência de qualidade de transmissão. `localStorage` (não
 * `sessionStorage` como `usuario-store.ts`) de propósito: isso é uma
 * característica do seu PC/conexão, não da sessão — faz sentido lembrar
 * entre abas e entre dias. Padrão: 1080p, 30fps, 4 Mbps (pedido pelo
 * usuário — ver docs/decisions.md, ADR 011).
 */
export const useConfigTransmissaoStore = create<ConfigTransmissaoState>()(
  persist(
    (set) => ({
      resolucao: "1080p",
      fps: 30,
      bitrateMbps: 4,
      definirResolucao: (resolucao) => set({ resolucao }),
      definirFps: (fps) => set({ fps }),
      definirBitrate: (bitrateMbps) => set({ bitrateMbps }),
    }),
    {
      name: "tela-junto:config-transmissao",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);
