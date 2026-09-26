"use client";

import { useEffect } from "react";

/**
 * Mantém a tela do aparelho acesa enquanto `ativo` (assistindo/transmitindo).
 * Sem isso o celular apaga a tela no meio da transmissão, e ao voltar a
 * conexão já caiu. O navegador solta o bloqueio sozinho sempre que a aba
 * vai pro segundo plano, então pede de novo ao voltar. Não faz nada onde a
 * API não existe (Safari antigo, HTTP sem TLS fora de localhost).
 */
export function useWakeLock(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;

    let bloqueio: WakeLockSentinel | null = null;
    let cancelado = false;

    async function pedir() {
      try {
        const novo = await navigator.wakeLock.request("screen");
        if (cancelado) {
          novo.release().catch(() => {});
          return;
        }
        bloqueio = novo;
      } catch {
        // Negado (economia de bateria, por exemplo) — segue sem, sem erro pra mostrar.
      }
    }

    function aoVoltar() {
      if (document.visibilityState === "visible") pedir();
    }

    pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      bloqueio?.release().catch(() => {});
    };
  }, [ativo]);
}
