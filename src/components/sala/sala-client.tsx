"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BellOff,
  Info,
  LogOut,
  MonitorUp,
  MonitorX,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePlay as YoutubeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSala } from "@/hooks/use-sala";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useAvisos } from "@/hooks/use-avisos";
import { useUsuarioStore, useUsuarioHidratado } from "@/store/usuario-store";
import {
  EVENTO_ABRIR_CHAT,
  EVENTO_MUDO,
  EVENTO_TELA_CHEIA,
  VideoTile,
} from "./video-tile";
import { YoutubePlayer } from "./youtube-player";
import { ListaParticipantes } from "./lista-participantes";
import { Chat } from "./chat";
import { CompartilharSalaDialog } from "./compartilhar-sala-dialog";
import { CopiarLinkButton } from "./copiar-link-button";
import { ConfigTransmissaoPopover } from "./config-transmissao-popover";
import { AdicionarFonteDialog } from "./adicionar-fonte-dialog";
import { EscolherNomeSala } from "./escolher-nome-sala";

interface SalaClientProps {
  codigo: string;
}

export function SalaClient({ codigo }: SalaClientProps) {
  const router = useRouter();
  const nome = useUsuarioStore((s) => s.nome);
  const hidratado = useUsuarioHidratado();
  const definirNome = useUsuarioStore((s) => s.definirNome);

  // Quem clica em "Continuar como convidado" ainda não tem `nome` (é o
  // próprio servidor que decide "Convidado N" — ver docs/decisions.md, ADR
  // 013), mas já está pronto pra entrar. Sem isso, quem abrisse o link
  // direto de uma sala (sem nunca ter passado pela home) ficava preso: o
  // fluxo antigo redirecionava pra "/" e perdia o código da sala, ou nem
  // isso — a página simplesmente não renderizava nada.
  const [quisConvidado, setQuisConvidado] = useState(false);
  const pronto = hidratado && (!!nome || quisConvidado);

  const {
    status,
    erro,
    euId,
    meuNome,
    participantes,
    mensagens,
    estouCompartilhando,
    streamLocal,
    streamsRemotos,
    linkPublico,
    fonteVideo,
    ultimoComandoVideo,
    adicionarFonteVideo,
    removerFonteVideo,
    enviarComandoVideo,
    enviarMensagem,
    lerEstatisticasEntrada,
    iniciarCompartilhamento,
    pararCompartilhamento,
    atualizarQualidadeAoVivo,
  } = useSala(codigo, nome, pronto);

  // Aba aberta no celular (no desktop os três painéis aparecem juntos) e
  // quantas mensagens o chat já mostrou — o que passa disso e não é minha
  // vira o contador de "não lidas" na aba. `vistas` só muda ao sair do chat,
  // então dá pra derivar tudo sem efeito.
  const [aba, setAba] = useState<"participantes" | "chat">("chat");
  const [vistas, setVistas] = useState(0);
  const lidas = aba === "chat" ? mensagens.length : vistas;
  const naoLidas = mensagens.slice(lidas).filter((m) => m.de !== euId).length;

  function trocarAba(nova: "participantes" | "chat") {
    if (nova !== "chat") setVistas(mensagens.length);
    setAba(nova);
  }

  // Tela acesa enquanto tem algo passando (ver `useWakeLock`).
  useWakeLock(
    !!streamLocal || Object.keys(streamsRemotos).length > 0 || !!fonteVideo
  );

  // Só desktop: esconde a lista de participantes pra dar mais largura ao
  // vídeo (vídeo + chat). `destaqueId` é a tela ampliada quando há 2+ (as
  // outras viram uma faixa de miniaturas); `null` = todas do mesmo tamanho.
  const [cinema, setCinema] = useState(false);
  const [destaqueId, setDestaqueId] = useState<string | null>(null);

  // Contador no título da aba + bipe quando chega mensagem ou alguém começa
  // a transmitir com a aba escondida (ver `useAvisos`).
  const { somLigado, alternarSom } = useAvisos({ mensagens, participantes, euId });

  // Atalhos: F tela cheia, M mudo, / chat, C modo cinema. Ignorados
  // enquanto se digita (campo de texto) ou com um diálogo aberto; o slider
  // de volume não conta como "digitando" — senão o atalho morreria depois
  // de mexer nele.
  useEffect(() => {
    function tela(seletor: string) {
      const cheia = document.fullscreenElement;
      if (cheia?.hasAttribute("data-video-tile")) return cheia;
      return (
        document.querySelector(`[data-destacado] ${seletor}`) ??
        document.querySelector(seletor)
      );
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement;
      if (
        alvo.closest(
          "input:not([type=range]), textarea, select, [contenteditable=true], [role=dialog]"
        )
      ) {
        return;
      }
      switch (e.key.toLowerCase()) {
        case "f":
          tela("[data-video-tile]")?.dispatchEvent(new Event(EVENTO_TELA_CHEIA));
          break;
        case "m":
          tela("[data-video-tile][data-remoto]")?.dispatchEvent(new Event(EVENTO_MUDO));
          break;
        case "c":
          setCinema((atual) => !atual);
          break;
        case "/": {
          e.preventDefault();
          const cheia = document.fullscreenElement;
          if (cheia?.hasAttribute("data-video-tile")) {
            cheia.dispatchEvent(new Event(EVENTO_ABRIR_CHAT));
            break;
          }
          const campos = document.querySelectorAll<HTMLInputElement>("[data-chat-input]");
          [...campos].find((c) => c.offsetParent !== null)?.focus();
          break;
        }
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  // Guarda o nome final (digitado ou "Convidado N" atribuído pelo
  // servidor) pra sobreviver a um refresh desta mesma aba.
  useEffect(() => {
    if (meuNome) definirNome(meuNome);
  }, [meuNome, definirNome]);

  if (!hidratado) return null; // instantâneo — não é o "tela preta infinita" de antes.

  if (!pronto) {
    return (
      <EscolherNomeSala
        codigo={codigo}
        aoEscolherNome={definirNome}
        aoEscolherConvidado={() => setQuisConvidado(true)}
      />
    );
  }

  if (status === "erro") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-destructive">{erro}</p>
        <Button onClick={() => router.push("/")}>Voltar</Button>
      </div>
    );
  }

  const telas = Object.entries(streamsRemotos);
  const souControladorDoVideo =
    !!fonteVideo && (fonteVideo.qualquerUmControla || fonteVideo.adicionadoPor === euId);
  const chatSobreposto = (
    <Chat mensagens={mensagens} euId={euId} onEnviar={enviarMensagem} />
  );
  type Destaque = { ativo: boolean; alternar: () => void } | undefined;
  const itens: { id: string; render: (d: Destaque) => ReactNode }[] = [];
  if (fonteVideo) {
    itens.push({
      id: "youtube",
      render: (d) => (
        <YoutubePlayer
          key={fonteVideo.youtubeId}
          youtubeId={fonteVideo.youtubeId}
          ehPlaylist={fonteVideo.ehPlaylist}
          souControlador={souControladorDoVideo}
          ultimoComando={ultimoComandoVideo}
          onComando={enviarComandoVideo}
          onRemover={souControladorDoVideo ? removerFonteVideo : undefined}
          destaque={d}
        />
      ),
    });
  }
  if (streamLocal) {
    itens.push({
      id: "local",
      render: (d) => (
        <VideoTile stream={streamLocal} nome="Você" mudo chat={chatSobreposto} destaque={d} />
      ),
    });
  }
  for (const [id, stream] of telas) {
    itens.push({
      id,
      render: (d) => (
        <VideoTile
          stream={stream}
          nome={participantes.find((p) => p.id === id)?.nome ?? "Participante"}
          participanteId={id}
          estatisticasDe={lerEstatisticasEntrada}
          chat={chatSobreposto}
          destaque={d}
        />
      ),
    });
  }
  const destaque =
    itens.length > 1 && itens.some((i) => i.id === destaqueId) ? destaqueId : null;
  const reconectando = status === "conectando" && euId !== null;
  const totalDeTelas = telas.length + (streamLocal ? 1 : 0) + (fonteVideo ? 1 : 0);
  const nadaAtivo = totalDeTelas === 0;
  async function compartilhar() {
    try {
      await iniciarCompartilhamento();
    } catch {
      // usuário cancelou o seletor de tela do navegador — sem erro pra mostrar.
    }
  }

  const botaoAdicionarVideo = (
    <Button size="sm" variant="outline" className="gap-1.5">
      <YoutubeIcon className="size-3.5" />
      <span className="hidden sm:inline">Adicionar vídeo</span>
    </Button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5 sm:gap-3 sm:px-4">
        <span className="hidden font-heading text-sm tracking-wide text-dust-4 sm:inline">
          SINAL
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          &gt; {codigo}
        </span>

        <div className="flex-1" />

        {estouCompartilhando ? (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={pararCompartilhamento}
          >
            <MonitorX className="size-3.5" />
            <span className="hidden sm:inline">Parar compartilhamento</span>
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={compartilhar}>
              <MonitorUp className="size-3.5" />
              <span className="hidden sm:inline">Compartilhar tela</span>
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="hidden size-6 items-center justify-center text-muted-foreground sm:flex" />
                }
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Pra levar o áudio de um vídeo sem pegar o áudio do Discord,
                escolha compartilhar uma aba do navegador (não a tela toda)
                quando ele perguntar o quê compartilhar.
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {!fonteVideo && (
          <AdicionarFonteDialog trigger={botaoAdicionarVideo} aoAdicionar={adicionarFonteVideo} />
        )}

        <ConfigTransmissaoPopover
          aoMudar={estouCompartilhando ? atualizarQualidadeAoVivo : undefined}
        />

        <div className="hidden items-center gap-0.5 md:flex">
          <BotaoCabecalho
            rotulo={cinema ? "Mostrar participantes (C)" : "Modo cinema (C)"}
            onClick={() => setCinema((c) => !c)}
          >
            {cinema ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </BotaoCabecalho>
          <BotaoCabecalho
            rotulo={somLigado ? "Silenciar avisos sonoros" : "Ligar avisos sonoros"}
            onClick={alternarSom}
          >
            {somLigado ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </BotaoCabecalho>
          <CopiarLinkButton linkPublico={linkPublico} />
        </div>

        <CompartilharSalaDialog codigo={codigo} linkPublico={linkPublico} />

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push("/")}
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>

      {reconectando && (
        <div
          role="status"
          className="mx-auto mt-2 flex w-fit items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs text-primary"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Reconectando…
        </div>
      )}

      {/* Celular: coluna que não rola a página — vídeo no topo (fixo), abas e
          o painel da aba ativa ocupando o resto. Assim o vídeo nunca sai da
          tela enquanto se lê o chat e o teclado só empurra o painel. No
          desktop volta a ser a grade de três colunas. */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 p-3 md:grid md:gap-4 md:p-4",
          cinema ? "md:grid-cols-[1fr_280px]" : "md:grid-cols-[200px_1fr_280px]"
        )}
      >
        <main
          className={cn(
            "order-1 shrink-0 md:order-2 md:min-h-0 md:shrink",
            !nadaAtivo && "max-h-[50dvh] overflow-y-auto md:max-h-none md:overflow-visible"
          )}
        >
          {nadaAtivo ? (
            <div className="campo-poeira flex h-full flex-col items-center justify-center gap-4 rounded-3xl bg-white/[0.03] p-6 text-center md:p-10">
              <p className="text-sm text-muted-foreground">
                Ninguém está compartilhando a tela ainda.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={compartilhar} className="gap-1.5">
                  <MonitorUp className="size-4" />
                  Compartilhar tela
                </Button>
                <AdicionarFonteDialog
                  aoAdicionar={adicionarFonteVideo}
                  trigger={
                    <Button variant="outline" className="gap-1.5">
                      <YoutubeIcon className="size-4" />
                      Adicionar vídeo
                    </Button>
                  }
                />
              </div>
              <p className="hidden max-w-sm text-xs text-muted-foreground md:block">
                Pra levar o áudio de um vídeo (YouTube, por exemplo) sem
                pegar o áudio do Discord, escolha compartilhar{" "}
                <span className="text-foreground">uma aba do navegador</span>,
                não a tela toda, quando o navegador perguntar.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid h-full auto-rows-fr grid-cols-1 gap-3",
                // Com uma única tela ela ocupa a largura toda; com 2+ divide
                // em duas colunas. Sempre 2 colunas deixava uma coluna vazia
                // e a tela única pela metade.
                itens.length > 1 && !destaque && "sm:grid-cols-2",
                // Destaque (desktop): a escolhida ocupa a linha de cima, as
                // outras viram miniaturas embaixo. Continuam filhas diretas
                // do mesmo grid (só muda a classe): trocar de pai remontaria
                // o player do YouTube e perderia a sincronia.
                destaque &&
                  "md:grid-cols-4 md:grid-rows-[minmax(0,1fr)_7rem] md:auto-rows-[7rem]"
              )}
            >
              {itens.map((item) => {
                const eDestaque = destaque === item.id;
                const miniatura = !!destaque && !eDestaque;
                return (
                  <div
                    key={item.id}
                    data-destacado={eDestaque ? "" : undefined}
                    className={cn(
                      "group/envoltorio relative min-h-0 md:flex md:items-center md:justify-center md:[container-type:size]",
                      destaque &&
                        (eDestaque ? "md:col-span-4 md:row-start-1" : "md:row-start-2")
                    )}
                  >
                    {item.render(
                      itens.length > 1
                        ? {
                            ativo: eDestaque,
                            alternar: () => setDestaqueId(eDestaque ? null : item.id),
                          }
                        : undefined
                    )}
                    {miniatura ? (
                      <button
                        type="button"
                        onClick={() => setDestaqueId(item.id)}
                        aria-label="Destacar esta tela"
                        title="Destacar esta tela"
                        className="absolute inset-0 z-10 hidden cursor-pointer hover:bg-white/5 md:block"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <div role="tablist" className="order-2 flex shrink-0 gap-1 rounded-full bg-white/[0.05] p-1 md:hidden">
          {(
            [
              ["chat", "Chat", naoLidas],
              ["participantes", `Participantes · ${participantes.length}`, 0],
            ] as const
          ).map(([id, rotulo, contagem]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => trocarAba(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-heading text-[11px] tracking-wide uppercase transition-colors",
                aba === id
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {rotulo}
              {contagem > 0 && (
                <span className="min-w-4 rounded-full bg-primary px-1.5 text-center text-[11px] leading-4 font-bold text-primary-foreground">
                  {contagem > 99 ? "99+" : contagem}
                </span>
              )}
            </button>
          ))}
        </div>

        <aside
          className={cn(
            "order-3 min-h-0 flex-1 overflow-y-auto rounded-3xl bg-white/[0.035] p-3 md:order-1 md:block md:flex-none md:overflow-visible md:p-4",
            aba !== "participantes" && "hidden",
            cinema && "md:hidden"
          )}
        >
          <h2 className="mb-3 hidden px-1 font-heading text-[11px] tracking-wide text-muted-foreground uppercase md:block">
            Participantes · {participantes.length}
          </h2>
          <ListaParticipantes participantes={participantes} euId={euId} />
        </aside>

        <aside
          className={cn(
            "order-3 min-h-0 flex-1 flex-col rounded-3xl bg-white/[0.035] p-3 md:order-3 md:flex md:flex-none md:p-4",
            aba === "chat" ? "flex" : "hidden"
          )}
        >
          <h2 className="mb-3 hidden px-1 font-heading text-[11px] tracking-wide text-muted-foreground uppercase md:block">
            Chat
          </h2>
          <Chat mensagens={mensagens} euId={euId} onEnviar={enviarMensagem} />
        </aside>
      </div>
    </div>
  );
}

/** Botão de ícone do cabeçalho, com dica no hover. */
function BotaoCabecalho({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClick}
            aria-label={rotulo}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{rotulo}</TooltipContent>
    </Tooltip>
  );
}
