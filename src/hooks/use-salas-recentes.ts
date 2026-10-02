"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  esquecerSala,
  lembrarSala,
  lerSalasRecentes,
  type SalaRecente,
} from "@/lib/salas-recentes";

const CHAVE = "sinal:salas-recentes";
/** Avisa as outras partes da MESMA aba (o evento `storage` só dispara em outras abas). */
const EVENTO = "sinal:salas-recentes-mudou";

function ler(): string | null {
  try {
    return window.localStorage.getItem(CHAVE);
  } catch {
    return null; // navegação privada / armazenamento bloqueado: segue sem lembrar.
  }
}

function gravar(texto: string) {
  try {
    window.localStorage.setItem(CHAVE, texto);
  } catch {
    // sem espaço ou bloqueado: perde só o "lembrar", nada mais.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aviso: () => void) {
  window.addEventListener("storage", aviso);
  window.addEventListener(EVENTO, aviso);
  return () => {
    window.removeEventListener("storage", aviso);
    window.removeEventListener(EVENTO, aviso);
  };
}

/** Guarda esta sala como a mais recente (chamado quando a entrada dá certo). */
export function lembrarSalaNesteAparelho(codigo: string) {
  gravar(lembrarSala(ler(), codigo, Date.now()));
}

/**
 * As últimas salas deste aparelho, pra home. No servidor (e na hidratação) a
 * lista é vazia — o `localStorage` só existe no navegador.
 */
export function useSalasRecentes(): {
  salas: SalaRecente[];
  agora: number;
  esquecer: (codigo: string) => void;
  limpar: () => void;
} {
  const bruto = useSyncExternalStore(assinar, ler, () => null);
  // "Há quanto tempo" é calculado em relação ao momento em que a home abriu.
  const [agora] = useState(() => Date.now());
  const salas = useMemo(() => lerSalasRecentes(bruto, agora), [bruto, agora]);

  const esquecer = useCallback((codigo: string) => gravar(esquecerSala(ler(), codigo, Date.now())), []);
  const limpar = useCallback(() => gravar("[]"), []);

  return { salas, agora, esquecer, limpar };
}
