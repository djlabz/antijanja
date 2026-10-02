"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useSalasRecentes } from "@/hooks/use-salas-recentes";
import { descreverQuando } from "@/lib/salas-recentes";

/**
 * As últimas salas em que você entrou (só neste aparelho, nada vai pro
 * servidor). Linhas de prompt, não cartões — ver DESIGN.md. Some sozinha
 * quando não há nenhuma.
 */
export function SalasRecentes() {
  const { salas, agora, esquecer, limpar } = useSalasRecentes();
  if (salas.length === 0) return null;

  return (
    <section aria-labelledby="titulo-recentes" className="flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <h2 id="titulo-recentes" className="font-mono text-xs text-muted-foreground">
          recentes&gt;
        </h2>
        <button
          type="button"
          onClick={limpar}
          className="font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring [@media(hover:none)]:min-h-11 [@media(hover:none)]:px-2"
        >
          limpar
        </button>
      </div>
      <ul className="flex flex-col">
        {salas.map((sala) => (
          <li key={sala.codigo} className="flex items-center gap-1">
            <Link
              href={`/sala/${encodeURIComponent(sala.codigo)}`}
              className="flex min-h-11 min-w-0 flex-1 items-baseline gap-3 rounded-full px-2 py-2 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                &gt; {sala.codigo}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {descreverQuando(sala.em, agora)}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => esquecer(sala.codigo)}
              aria-label={`Esquecer a sala ${sala.codigo}`}
              title="Esquecer esta sala"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
