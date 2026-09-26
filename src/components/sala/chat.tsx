"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { corDoParticipante } from "@/lib/cor-participante";
import type { ChatMessage, ParticipantId } from "@/lib/socket-events";

interface ChatProps {
  mensagens: ChatMessage[];
  euId: ParticipantId | null;
  onEnviar: (texto: string) => void;
}

// Distância do fundo (px) até onde ainda conta como "estou lendo o fim" e a
// lista deve acompanhar mensagens novas; mais acima, a pessoa está lendo o
// histórico e não deve ser puxada pra baixo.
const MARGEM_FIM = 80;

function formatarHorario(em: number) {
  return new Date(em).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Chat({ mensagens, euId, onEnviar }: ChatProps) {
  const [texto, setTexto] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const colarNoFimRef = useRef(true);
  const alturaRef = useRef(0);

  function aoRolar() {
    const lista = listaRef.current;
    if (!lista) return;
    // Rolagem que vem junto com mudança de altura (aba reaparecendo, teclado)
    // é o navegador restaurando/ajustando a posição, não a pessoa lendo o
    // histórico — se contasse, o chat desistiria de ir pro fim.
    if (lista.clientHeight !== alturaRef.current) return;
    colarNoFimRef.current =
      lista.scrollHeight - lista.scrollTop - lista.clientHeight < MARGEM_FIM;
  }

  // Rola só a própria lista (`scrollTop`), nunca `scrollIntoView`: esse
  // rola também a página inteira, e no celular cada mensagem nova puxava
  // a tela pra longe do vídeo.
  useEffect(() => {
    const lista = listaRef.current;
    if (!lista) return;
    const ultima = mensagens[mensagens.length - 1];
    if (colarNoFimRef.current || ultima?.de === euId) {
      lista.scrollTop = lista.scrollHeight;
    }
  }, [mensagens, euId]);

  // A lista muda de tamanho quando a aba do chat reaparece (no celular ela
  // fica `display: none` fora da aba) e quando o teclado abre/fecha; se a
  // pessoa estava no fim, continua no fim em vez de ficar com as mensagens
  // novas escondidas embaixo.
  useEffect(() => {
    const lista = listaRef.current;
    if (!lista) return;
    alturaRef.current = lista.clientHeight;
    const observador = new ResizeObserver(() => {
      alturaRef.current = lista.clientHeight;
      if (colarNoFimRef.current) lista.scrollTop = lista.scrollHeight;
    });
    observador.observe(lista);
    return () => observador.disconnect();
  }, []);

  function enviar() {
    const limpo = texto.trim();
    if (!limpo) return;
    onEnviar(limpo);
    setTexto("");
    colarNoFimRef.current = true;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Sem caixa/borda ao redor do histórico — as mensagens vivem direto
          no vazio, separadas por linha de base (ver DESIGN.md). Rolagem
          nativa (não o ScrollArea do Shadcn) pra ter inércia/overscroll
          corretos no toque. */}
      <div
        ref={listaRef}
        onScroll={aoRolar}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="flex flex-col gap-2 py-1">
          {mensagens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          )}
          {mensagens.map((m, i) => {
            const minha = m.de === euId;
            return (
              <div
                key={i}
                className={cn(
                  "flex animate-in flex-col gap-0.5 fade-in-0 slide-in-from-bottom-1 duration-200",
                  minha ? "items-end" : "items-start"
                )}
              >
                <span className="px-2 text-xs text-muted-foreground">
                  {!minha && (
                    <span className="font-semibold" style={{ color: corDoParticipante(m.de) }}>
                      {m.nome}{" "}
                    </span>
                  )}
                  <time dateTime={new Date(m.em).toISOString()} className="tabular-nums">
                    {formatarHorario(m.em)}
                  </time>
                </span>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm leading-snug break-words",
                    minha
                      ? "rounded-br-md bg-primary/15 text-foreground"
                      : "rounded-bl-md bg-white/[0.06] text-foreground/90"
                  )}
                >
                  {m.texto}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <form
        className="flex shrink-0 items-center gap-2"
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
          data-chat-input
          enterKeyHint="send"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon-lg"
          aria-label="Enviar mensagem"
          // Tocar no botão tira o foco do campo e fecha o teclado do
          // celular a cada mensagem; segurar o foco deixa mandar várias.
          onPointerDown={(e) => e.preventDefault()}
        >
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
