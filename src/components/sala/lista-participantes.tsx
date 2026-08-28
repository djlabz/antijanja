import { MonitorUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { corDoParticipante } from "@/lib/cor-participante";
import type { Participant, ParticipantId } from "@/lib/socket-events";

interface ListaParticipantesProps {
  participantes: Participant[];
  euId: ParticipantId | null;
}

export function ListaParticipantes({ participantes, euId }: ListaParticipantesProps) {
  return (
    <ul className="flex flex-col gap-1">
      {participantes.map((p) => (
        <li
          key={p.id}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
        >
          <Avatar className="size-7">
            <AvatarFallback
              className="text-[10px] font-semibold text-white"
              style={{ backgroundColor: corDoParticipante(p.id) }}
            >
              {p.nome.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate">
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
