import { MonitorUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { corDoParticipante } from "@/lib/cor-participante";
import type { Participant, ParticipantId } from "@/lib/socket-events";

interface ListaParticipantesProps {
  participantes: Participant[];
  euId: ParticipantId | null;
}

/**
 * Fila de créditos, não lista de contatos (ver DESIGN.md, "Fila de Créditos
 * Cracktro"): quem está compartilhando a tela agora é o plano da frente —
 * brilhante, opacidade cheia; quem só está presente fica atrás, na
 * penumbra. Ordenar por estado (compartilhando primeiro) faz a hierarquia
 * de PROFUNDIDADE literal, não só decorativa.
 */
export function ListaParticipantes({ participantes, euId }: ListaParticipantesProps) {
  const ordenados = [...participantes].sort((a, b) =>
    a.compartilhando === b.compartilhando ? 0 : a.compartilhando ? -1 : 1
  );

  return (
    <ul className="flex flex-col gap-0.5">
      {ordenados.map((p) => (
        <li
          key={p.id}
          className={cn(
            "flex items-center gap-2.5 rounded-full px-2 py-1.5 transition-colors hover:bg-white/[0.04]",
            // Profundidade = brilho: quem compartilha fica cheio (frente);
            // quem só assiste perde opacidade (atrás, na penumbra).
            p.compartilhando ? "opacity-100" : "opacity-55"
          )}
        >
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
            style={{ backgroundColor: corDoParticipante(p.id) }}
          >
            {p.nome.slice(0, 2).toUpperCase()}
          </span>
          <span
            className={cn(
              "flex-1 truncate text-sm",
              p.compartilhando && "font-medium text-dust-4"
            )}
          >
            {p.nome}
            {p.id === euId && <span className="text-muted-foreground"> (você)</span>}
          </span>
          {p.compartilhando && (
            <MonitorUp className="size-3.5 shrink-0 text-primary" aria-label="Compartilhando a tela" />
          )}
        </li>
      ))}
    </ul>
  );
}
