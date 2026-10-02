"use client";

import { memo, useEffect, useRef, useState } from "react";
import { SendHorizontal, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { corDoParticipante } from "@/lib/cor-participante";
import { partirEmLinks } from "@/lib/links-chat";
import { REACOES, type ChatMessage, type ParticipantId } from "@/lib/socket-events";

interface ChatProps {
  mensagens: ChatMessage[];
  euId: ParticipantId | null;
  onEnviar: (texto: string) => void;
  /** Manda uma reação que flutua sobre o vídeo (não entra no chat). */
  onReagir?: (emoji: string) => void;
  /**
   * Sem conexão com a sala (conectando/reconectando): o campo fica só leitura e
   * o texto digitado espera. Mandar agora perderia a mensagem em silêncio — o
   * servidor ignora quem ainda não entrou.
   */
  pausado?: boolean;
}

// Distância do fundo (px) até onde ainda conta como "estou lendo o fim" e a
// lista deve acompanhar mensagens novas; mais acima, a pessoa está lendo o
// histórico e não deve ser puxada pra baixo.
const MARGEM_FIM = 80;

/** Texto da mensagem com os links http(s) clicáveis (abrem em outra aba, sem dar acesso à sala). */
function TextoComLinks({ texto }: { texto: string }) {
  return partirEmLinks(texto).map((parte, i) =>
    parte.tipo === "link" ? (
      <a
        key={i}
        href={parte.valor}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-primary underline underline-offset-2 break-all hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {parte.valor}
      </a>
    ) : (
      parte.valor
    )
  );
}

function formatarHorario(em: number) {
  return new Date(em).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// `memo`: a sala re-renderiza a cada reação que chega (o estado das reações
// mora no mesmo hook); sem isso o histórico inteiro do chat era redesenhado
// junto, e com reações em enxurrada pesava.
export const Chat = memo(function Chat({ mensagens, euId, onEnviar, onReagir, pausado }: ChatProps) {
  const [texto, setTexto] = useState("");
  const [reagindo, setReagindo] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
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

  // Fecha o seletor de reações ao clicar fora dele ou apertar Esc.
  useEffect(() => {
    if (!reagindo) return;
    function fora(e: MouseEvent) {
      if (!formRef.current?.contains(e.target as Node)) setReagindo(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setReagindo(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [reagindo]);

  function enviar() {
    const limpo = texto.trim();
    if (!limpo || pausado) return;
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
        // `log` é anunciado como "educado" por leitores de tela: mensagem nova
        // é lida sem interromper, e só as novas (não o histórico todo).
        role="log"
        aria-label="Mensagens do chat"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="flex flex-col gap-2 py-1">
          {mensagens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          )}
          {mensagens.map((m) => {
            if (m.sistema) {
              return (
                <p
                  key={m.id}
                  className="animate-in py-0.5 text-center text-xs text-muted-foreground fade-in-0 duration-200"
                >
                  {m.texto}
                </p>
              );
            }
            const minha = m.de === euId;
            return (
              <div
                key={m.id}
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
                  <TextoComLinks texto={m.texto} />
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <form
        ref={formRef}
        className="relative flex shrink-0 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        {onReagir && (
          <>
            {reagindo && (
              <div
                role="group"
                aria-label="Reações"
                className="absolute bottom-full left-0 mb-2 flex animate-in gap-0.5 rounded-full bg-popover p-1.5 ring-1 ring-foreground/10 fade-in-0 slide-in-from-bottom-1 duration-150"
              >
                {REACOES.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReagir(emoji)}
                    // Não tira o foco do campo (teclado do celular continua aberto).
                    onPointerDown={(e) => e.preventDefault()}
                    className="flex size-9 items-center justify-center rounded-full text-xl transition-transform hover:bg-white/10 active:scale-90"
                    aria-label={`Reagir com ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Reações"
              aria-expanded={reagindo}
              onClick={() => setReagindo((r) => !r)}
              onPointerDown={(e) => e.preventDefault()}
              className="shrink-0"
            >
              <SmilePlus className="size-5" />
            </Button>
          </>
        )}
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={pausado ? "Conectando…" : "Mensagem"}
          aria-label="Escreva uma mensagem"
          // `readOnly` (e não `disabled`) pra o campo não perder o foco na
          // queda e o que já foi digitado seguir lá quando a conexão voltar.
          readOnly={pausado}
          maxLength={500}
          data-chat-input
          enterKeyHint="send"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon-lg"
          aria-label="Enviar mensagem"
          disabled={pausado}
          // Tocar no botão tira o foco do campo e fecha o teclado do
          // celular a cada mensagem; segurar o foco deixa mandar várias.
          onPointerDown={(e) => e.preventDefault()}
        >
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
});
