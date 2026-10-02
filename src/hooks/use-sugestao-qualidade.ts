"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfigTransmissaoStore } from "@/store/config-transmissao-store";
import { espectadoresLimitados, sugerirReducao, type Sugestao } from "@/lib/sugestao-qualidade";
import type { LinhaSaude } from "./use-saude-transmissao";

/** Quantas leituras seguidas (2,5s cada) com alguém limitado antes de avisar: ignora picos. */
const LEITURAS_SEGUIDAS = 3;
/** Depois de baixar a qualidade, dá um tempo pra ela fazer efeito antes de sugerir de novo. */
const ESPERA_APOS_APLICAR_MS = 3 * 60_000;
/** Depois de "Agora não", não insiste. */
const ESPERA_APOS_DISPENSAR_MS = 10 * 60_000;

export interface SugestaoAtiva extends Sugestao {
  /** Quantas pessoas estão recebendo com o envio limitado agora. */
  quantos: number;
}

/**
 * Avisa quem transmite quando o upload não dá conta (alguém recebendo com o
 * envio limitado por banda/CPU por várias leituras seguidas) e oferece o
 * degrau de qualidade abaixo com um clique. `aplicar` reaplica a captura e o
 * bitrate já no meio da transmissão (`atualizarQualidadeAoVivo`).
 *
 * `avaliar` é chamado a cada leitura de saúde (ver `useSaudeTransmissao`):
 * decidir ali, num callback, evita um efeito que reage a cada leitura.
 */
export function useSugestaoQualidade(ativo: boolean, aplicar: () => Promise<void>) {
  const [sugestao, setSugestao] = useState<SugestaoAtiva | null>(null);
  const seguidasRef = useRef(0);
  const silenciadoAteRef = useRef(0);

  // Terminou a transmissão: a próxima começa do zero (sem aviso nem silêncio velhos).
  useEffect(() => {
    if (!ativo) return;
    return () => {
      seguidasRef.current = 0;
      silenciadoAteRef.current = 0;
      setSugestao(null);
    };
  }, [ativo]);

  const avaliar = useCallback((linhas: LinhaSaude[]) => {
    const quantos = espectadoresLimitados(linhas);
    seguidasRef.current = quantos > 0 ? seguidasRef.current + 1 : 0;
    if (quantos === 0) {
      setSugestao(null);
      return;
    }
    if (seguidasRef.current < LEITURAS_SEGUIDAS || Date.now() < silenciadoAteRef.current) return;
    const { resolucao, fps, bitrateMbps } = useConfigTransmissaoStore.getState();
    const proxima = sugerirReducao({ resolucao, fps, bitrateMbps });
    setSugestao(proxima ? { ...proxima, quantos } : null);
  }, []);

  const aceitar = useCallback(async () => {
    const atual = useConfigTransmissaoStore.getState();
    const proxima = sugerirReducao({
      resolucao: atual.resolucao,
      fps: atual.fps,
      bitrateMbps: atual.bitrateMbps,
    });
    silenciadoAteRef.current = Date.now() + ESPERA_APOS_APLICAR_MS;
    seguidasRef.current = 0;
    setSugestao(null);
    if (!proxima) return;
    atual.definirResolucao(proxima.nova.resolucao);
    atual.definirFps(proxima.nova.fps);
    atual.definirBitrate(proxima.nova.bitrateMbps);
    await aplicar();
  }, [aplicar]);

  const dispensar = useCallback(() => {
    silenciadoAteRef.current = Date.now() + ESPERA_APOS_DISPENSAR_MS;
    seguidasRef.current = 0;
    setSugestao(null);
  }, []);

  return { sugestao: ativo ? sugestao : null, avaliar, aceitar, dispensar };
}
