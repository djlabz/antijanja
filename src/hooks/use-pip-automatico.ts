"use client";

import { useEffect, useRef } from "react";

/**
 * Picture-in-Picture automático: enquanto `ativo` (há uma transmissão sendo
 * assistida), registra no Media Session a ação `enterpictureinpicture`. É o
 * único jeito do navegador abrir o PiP sem clique da pessoa — o Chrome/Edge
 * chama essa ação sozinho quando se troca de aba, e o vídeo vira uma janelinha
 * flutuante (ADR 026). Sem suporte (Firefox, Safari, Chrome antigo) o
 * `setActionHandler` rejeita a ação e nada acontece: o botão/`P` continuam.
 *
 * `entrar` fica numa ref pra o handler não ser registrado de novo a cada
 * render da sala.
 */
export function usePipAutomatico(ativo: boolean, entrar: () => void) {
  const entrarRef = useRef(entrar);
  useEffect(() => {
    entrarRef.current = entrar;
  });

  useEffect(() => {
    if (!ativo || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const sessao = navigator.mediaSession;
    try {
      sessao.setActionHandler("enterpictureinpicture" as MediaSessionAction, () => {
        // Já está em PiP: não alternar (a função da sala é um liga/desliga).
        if (!document.pictureInPictureElement) entrarRef.current();
      });
    } catch {
      return; // navegador sem essa ação.
    }
    return () => {
      try {
        sessao.setActionHandler("enterpictureinpicture" as MediaSessionAction, null);
      } catch {
        // nada a desfazer.
      }
    };
  }, [ativo]);
}
