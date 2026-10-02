"use client";

import { useSyncExternalStore } from "react";
import type { ReacoesStore } from "@/lib/reacoes-store";

/**
 * Emojis subindo sobre o vídeo, cada um com o nome de quem reagiu embaixo.
 * Só decoração: não recebe clique (`pointer-events-none`) e fica fora da
 * árvore de acessibilidade — a conversa de verdade está no chat.
 */
export function ReacoesFlutuantes({ reacoes: store }: { reacoes: ReacoesStore }) {
  // Só este componente re-renderiza a cada reação (ver `reacoes-store.ts`).
  const reacoes = useSyncExternalStore(store.assinar, store.ler, store.ler);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {reacoes.map((r) => (
        <div
          key={r.id}
          className="reacao-flutuante absolute bottom-8 flex -translate-x-1/2 flex-col items-center gap-0.5"
          style={{ left: `${r.x}%` }}
        >
          <span className="text-4xl leading-none">{r.emoji}</span>
          <span className="max-w-24 truncate rounded-full bg-black/55 px-2 text-xs text-white/90">
            {r.nome}
          </span>
        </div>
      ))}
    </div>
  );
}
