"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  assinarInfo,
  carregarInfo,
  lerInfo,
  type InfoYoutube,
  type RefYoutube,
} from "@/lib/youtube-info";

const semInfo = () => undefined;

/**
 * Título/autor/miniatura de um vídeo ou playlist do YouTube. `undefined` =
 * ainda buscando, `null` = o YouTube não conhece esse link (mostra o texto
 * genérico). O cache é compartilhado (`youtube-info.ts`), então a mesma
 * linha em dois lugares só busca uma vez.
 */
export function useInfoYoutube({ youtubeId, ehPlaylist }: RefYoutube): InfoYoutube | null | undefined {
  const info = useSyncExternalStore(
    assinarInfo,
    () => lerInfo({ youtubeId, ehPlaylist }),
    semInfo
  );

  useEffect(() => {
    void carregarInfo({ youtubeId, ehPlaylist });
  }, [youtubeId, ehPlaylist]);

  return info;
}
