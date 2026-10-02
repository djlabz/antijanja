"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Participant, ParticipantId } from "@/lib/socket-events";

const CHAVE_SOM = "sinal:avisos-som";

let contextoAudio: AudioContext | null = null;

/** Bipe curto gerado na hora (sem arquivo de áudio pra carregar/hospedar). */
function tocarBipe() {
  try {
    contextoAudio ??= new AudioContext();
    const ctx = contextoAudio;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // sem Web Audio — segue só com o contador no título.
  }
}

interface AvisosProps {
  mensagens: ChatMessage[];
  participantes: Participant[];
  euId: ParticipantId | null;
}

/**
 * Avisa quem está em outra aba/janela (Discord, jogo) do que acontece na
 * sala: mensagem nova ou alguém começando a transmitir. O aviso é um
 * contador no título da aba — "(3) Sinal" — mais um bipe opcional. Só
 * dispara com a aba escondida; ao voltar, zera. O título é escrito direto
 * no `document` (sem estado do React) pra não re-renderizar a sala inteira
 * a cada aviso.
 */
export function useAvisos({ mensagens, participantes, euId }: AvisosProps) {
  const [somLigado, setSomLigado] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SOM) !== "0";
    } catch {
      return true;
    }
  });

  const somRef = useRef(somLigado);
  const pendentesRef = useRef(0);
  const mensagensVistasRef = useRef(mensagens.length);
  const transmissoresRef = useRef<Set<ParticipantId>>(new Set());

  useEffect(() => {
    somRef.current = somLigado;
  }, [somLigado]);

  // Navegadores só liberam áudio depois de um gesto da pessoa. Destravar no
  // primeiro toque/clique na página faz o primeiro aviso já sair com som, em
  // vez de mudo (antes só destravava ao ligar o sino).
  useEffect(() => {
    function destravar() {
      try {
        contextoAudio ??= new AudioContext();
        if (contextoAudio.state === "suspended") contextoAudio.resume().catch(() => {});
      } catch {
        // sem Web Audio — fica só o título.
      }
    }
    document.addEventListener("pointerdown", destravar, { once: true });
    return () => document.removeEventListener("pointerdown", destravar);
  }, []);

  // O título-base é lido na hora (tirando o "(n) " que a gente mesmo põe),
  // não guardado no mount: numa navegação do Next o `<title>` pode ainda
  // estar vazio nesse instante, e o aviso ficaria só "(3)".
  const atualizarTitulo = useCallback(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "") || "Sinal";
    document.title = pendentesRef.current > 0 ? `(${pendentesRef.current}) ${base}` : base;
  }, []);

  const avisar = useCallback(
    (quantos: number) => {
      if (!document.hidden) return;
      pendentesRef.current += quantos;
      atualizarTitulo();
      if (somRef.current) tocarBipe();
    },
    [atualizarTitulo]
  );

  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState !== "visible") return;
      pendentesRef.current = 0;
      atualizarTitulo();
    }
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      pendentesRef.current = 0;
      atualizarTitulo();
    };
  }, [atualizarTitulo]);

  useEffect(() => {
    const novas = mensagens.slice(mensagensVistasRef.current);
    mensagensVistasRef.current = mensagens.length;
    const deOutros = novas.filter((m) => m.de !== euId && !m.sistema).length;
    if (deOutros > 0) avisar(deOutros);
  }, [mensagens, euId, avisar]);

  useEffect(() => {
    const agora = new Set(
      participantes.filter((p) => p.compartilhando && p.id !== euId).map((p) => p.id)
    );
    let iniciaram = 0;
    for (const id of agora) if (!transmissoresRef.current.has(id)) iniciaram++;
    transmissoresRef.current = agora;
    if (iniciaram > 0) avisar(iniciaram);
  }, [participantes, euId, avisar]);

  const alternarSom = useCallback(() => {
    const novo = !somRef.current;
    setSomLigado(novo);
    try {
      localStorage.setItem(CHAVE_SOM, novo ? "1" : "0");
    } catch {
      // sem localStorage — vale só até recarregar.
    }
    // Toca já ao ligar: confirma que funciona e destrava o áudio do navegador.
    if (novo) tocarBipe();
  }, []);

  return { somLigado, alternarSom };
}
