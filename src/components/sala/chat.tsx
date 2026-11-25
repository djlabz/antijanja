"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Reply, SendHorizontal, SmilePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { corDoParticipante } from "@/lib/cor-participante";
import { partirEmLinks } from "@/lib/links-chat";
import { REACOES, type ChatMessage, type ParticipantId } from "@/lib/socket-events";

interface ChatProps {
  mensagens: ChatMessage[];
  euId: ParticipantId | null;
  /** `respondeA` é o id da mensagem que esta responde (o servidor monta a citação). */
  onEnviar: (texto: string, respondeA?: number) => void;
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

/** A mensagem citada dentro do balão de uma resposta; vira botão quando dá pra ir até a original. */
function Citacao({
  autor,
  texto,
  cor,
  aoAbrir,
}: {
  autor: string;
  texto: string;
  cor?: string;
  aoAbrir?: () => void;
}) {
  const classe = "mb-1 block w-full rounded-lg border-l-2 bg-black/20 px-2 py-1 text-left";
  const estilo = { borderLeftColor: cor ?? "var(--muted-foreground)" };
  const corpo = (
    <>
      <span className="block text-xs font-semibold" style={cor ? { color: cor } : undefined}>
        {autor}
      </span>
      <span className="line-clamp-2 text-xs text-foreground/70">{texto}</span>
    </>
  );
  if (!aoAbrir) {
    return (
      <span className={classe} style={estilo}>
        {corpo}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-label={`Ir para a mensagem de ${autor}`}
      className={cn(classe, "hover:bg-black/30 focus-visible:outline-2 focus-visible:outline-ring")}
      style={estilo}
    >
      {corpo}
    </button>
  );
}

function formatarHorario(em: number) {
  return new Date(em).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Alvo de toque de 44px sem ocupar 44px no balão: o botão é pequeno e o
// pseudo-elemento estende a área clicável (só onde não há hover).
const BOTAO_PEQUENO =
  "relative flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-opacity hover:bg-white/10 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring [@media(hover:none)]:size-8 [@media(hover:none)]:after:absolute [@media(hover:none)]:after:-inset-1.5";

/** Duração do realce da mensagem original depois de tocar na citação. */
const REALCE_MS = 1400;

// `memo`: a sala re-renderiza a cada reação que chega (o estado das reações
// mora no mesmo hook); sem isso o histórico inteiro do chat era redesenhado
// junto, e com reações em enxurrada pesava.
export const Chat = memo(function Chat({ mensagens, euId, onEnviar, onReagir, pausado }: ChatProps) {
  const [texto, setTexto] = useState("");
  const [reagindo, setReagindo] = useState(false);
  // A mensagem que o próximo envio vai responder (guardada inteira: continua
  // valendo mesmo se ela sair da lista).
  const [respondendo, setRespondendo] = useState<ChatMessage | null>(null);
  const [realcada, setRealcada] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const colarNoFimRef = useRef(true);
  const alturaRef = useRef(0);
  const timerRealceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Pra achar a mensagem original de uma citação (cor, "Você", pular até ela).
  const porId = useMemo(() => new Map(mensagens.map((m) => [m.id, m])), [mensagens]);

  useEffect(() => () => clearTimeout(timerRealceRef.current), []);

  function responder(m: ChatMessage) {
    setRespondendo(m);
    campoRef.current?.focus();
  }

  // Rola só a lista até a mensagem citada e a realça um instante.
  function irPara(id: number) {
    const lista = listaRef.current;
    const alvo = lista?.querySelector<HTMLElement>(`[data-mensagem-id="${id}"]`);
    if (!lista || !alvo) return;
    const distancia =
      alvo.getBoundingClientRect().top -
      lista.getBoundingClientRect().top -
      (lista.clientHeight - alvo.clientHeight) / 2;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lista.scrollTo({ top: lista.scrollTop + distancia, behavior: reduzido ? "auto" : "smooth" });
    setRealcada(id);
    clearTimeout(timerRealceRef.current);
    timerRealceRef.current = setTimeout(() => setRealcada(null), REALCE_MS);
  }

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
    onEnviar(limpo, respondendo?.id);
    setTexto("");
    setRespondendo(null);
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
            const citada = m.respondeA;
            // A original, se ainda está na lista: dá a cor, o "Você" e o destino do toque.
            const original = citada ? porId.get(citada.id) : undefined;
            const autorDaCitacao = original && original.de === euId ? "Você" : citada?.nome;
            return (
              <div
                key={m.id}
                className={cn(
                  "group/msg flex animate-in flex-col gap-0.5 fade-in-0 slide-in-from-bottom-1 duration-200",
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
                {/* O botão de responder fica do lado de dentro do corredor: à
                    esquerda do balão quando é meu, à direita quando é de outro. */}
                <div className={cn("flex max-w-[92%] items-center gap-1", minha && "flex-row-reverse")}>
                  <div
                    data-mensagem-id={m.id}
                    className={cn(
                      "min-w-0 rounded-2xl px-3 py-1.5 text-sm leading-snug break-words transition-colors duration-500",
                      minha
                        ? "rounded-br-md bg-primary/15 text-foreground"
                        : "rounded-bl-md bg-white/[0.06] text-foreground/90",
                      realcada === m.id && (minha ? "bg-primary/35" : "bg-white/[0.18]")
                    )}
                  >
                    {citada && (
                      <Citacao
                        autor={autorDaCitacao ?? citada.nome}
                        texto={citada.texto}
                        cor={original ? corDoParticipante(original.de) : undefined}
                        // Sem a original na lista (já rolou pra fora), não há pra onde ir.
                        aoAbrir={original ? () => irPara(citada.id) : undefined}
                      />
                    )}
                    <p>
                      <TextoComLinks texto={m.texto} />
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => responder(m)}
                    // Mantém o foco onde está (teclado do celular aberto, campo ativo).
                    onPointerDown={(e) => e.preventDefault()}
                    aria-label={`Responder a ${minha ? "sua mensagem" : m.nome}`}
                    title="Responder"
                    className={cn(
                      BOTAO_PEQUENO,
                      "opacity-0 group-hover/msg:opacity-100 [@media(hover:none)]:opacity-60"
                    )}
                  >
                    <Reply className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {respondendo && (
        <div
          role="group"
          aria-label="Respondendo a uma mensagem"
          className="flex shrink-0 animate-in items-center gap-2 rounded-2xl bg-white/[0.05] py-1.5 pr-1.5 pl-3 fade-in-0 slide-in-from-bottom-1 duration-150"
        >
          <div
            className="min-w-0 flex-1 border-l-2 pl-2"
            style={{ borderLeftColor: corDoParticipante(respondendo.de) }}
          >
            <span className="block truncate text-xs font-semibold" style={{ color: corDoParticipante(respondendo.de) }}>
              Respondendo a {respondendo.de === euId ? "você" : respondendo.nome}
            </span>
            <span className="block truncate text-xs text-foreground/70">{respondendo.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setRespondendo(null);
              campoRef.current?.focus();
            }}
            onPointerDown={(e) => e.preventDefault()}
            aria-label="Cancelar resposta"
            className={BOTAO_PEQUENO}
          >
            <X className="size-4" />
          </button>
        </div>
      )}
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
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && respondendo) setRespondendo(null);
          }}
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
