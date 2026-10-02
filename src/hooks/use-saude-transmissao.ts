"use client";

import { useEffect, useRef, useState } from "react";
import type { SaudeSaida } from "@/lib/conexoes-webrtc";
import type { ParticipantId } from "@/lib/socket-events";

export interface LinhaSaude extends SaudeSaida {
  /** Vazão atual pra esse espectador, em Mbps (null até ter duas leituras). */
  mbps: number | null;
}

/**
 * Lê a saúde de cada conexão de saída a cada 2,5s enquanto a aba está visível
 * (`ler` é `saude` de `conexoes-webrtc`) e calcula a vazão de cada espectador
 * pela diferença de bytes entre duas leituras. Fica num hook só pra o painel
 * "N assistindo" e o aviso de baixar a qualidade lerem a MESMA amostra, sem
 * consultar o WebRTC duas vezes.
 */
export function useSaudeTransmissao(
  ler: () => Promise<SaudeSaida[]>,
  ativo: boolean,
  /** Chamado com cada leitura pronta (a sala usa pra decidir se sugere baixar a qualidade). */
  aoLer?: (linhas: LinhaSaude[]) => void
): LinhaSaude[] {
  const [linhas, setLinhas] = useState<LinhaSaude[]>([]);
  // Por ref: trocar o callback não pode reiniciar o relógio das leituras.
  const aoLerRef = useRef(aoLer);
  useEffect(() => {
    aoLerRef.current = aoLer;
  }, [aoLer]);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    let anterior = new Map<ParticipantId, { bytes: number; em: number }>();

    async function atualizar() {
      if (document.hidden) return;
      const leituras = await ler().catch(() => null);
      if (!vivo || !leituras) return;
      const proximo = new Map<ParticipantId, { bytes: number; em: number }>();
      const novas = leituras.map((l) => {
        const antes = anterior.get(l.id);
        proximo.set(l.id, { bytes: l.bytes, em: l.em });
        const mbps =
          antes && l.em > antes.em ? ((l.bytes - antes.bytes) * 8) / ((l.em - antes.em) * 1000) : null;
        return { ...l, mbps };
      });
      setLinhas(novas);
      anterior = proximo;
      aoLerRef.current?.(novas);
    }

    atualizar();
    const id = setInterval(atualizar, 2500);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [ler, ativo]);

  // Parou de transmitir: some o painel (as linhas antigas não valem mais).
  return ativo ? linhas : [];
}
