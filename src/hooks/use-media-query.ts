"use client";

import { useSyncExternalStore } from "react";

/**
 * Segue uma media query (ex.: `(min-width: 1024px)`) e re-renderiza quando
 * ela muda. Pra decisões de layout que o CSS sozinho não resolve, como "qual
 * é o padrão do painel de participantes nesta largura".
 */
export function useMediaQuery(consulta: string): boolean {
  return useSyncExternalStore(
    (aviso) => {
      const lista = window.matchMedia(consulta);
      lista.addEventListener("change", aviso);
      return () => lista.removeEventListener("change", aviso);
    },
    () => window.matchMedia(consulta).matches,
    () => false
  );
}
