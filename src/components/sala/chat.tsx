"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { corDoParticipante } from "@/lib/cor-participante";
import type { ChatMessage, ParticipantId } from "@/lib/socket-events";

interface ChatProps {
  mensagens: ChatMessage[];
  euId: ParticipantId | null;
  onEnviar: (texto: string) => void;
}

export function Chat({ mensagens, euId, onEnviar }: ChatProps) {
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length]);

  function enviar() {
    const limpo = texto.trim();
    if (!limpo) return;
    onEnviar(limpo);
    setTexto("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Sem caixa/borda ao redor do histórico — as mensagens vivem direto
          no vazio, separadas por linha de base (ver DESIGN.md). */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 py-1">
          {mensagens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          )}
          {mensagens.map((m, i) => (
            <p key={i} className="text-sm leading-snug break-words">
              <span
                className="font-semibold"
                style={{ color: m.de === euId ? undefined : corDoParticipante(m.de) }}
              >
                {m.de === euId ? "Você" : m.nome}
              </span>
              <span className="text-foreground/90">: {m.texto}</span>
            </p>
          ))}
          <div ref={fimRef} />
        </div>
      </ScrollArea>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem"
          maxLength={500}
        />
        <Button type="submit" size="icon" variant="ghost" aria-label="Enviar mensagem">
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
