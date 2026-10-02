"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  LayoutGrid,
  MessageSquare,
  Maximize,
  Minimize,
  Pin,
  PictureInPicture2,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { alternarTelaCheia } from "@/lib/tela-cheia";
import type { EstadoConexao, EstatisticasVideo } from "@/hooks/use-sala";
import type { ReacoesStore } from "@/lib/reacoes-store";
import { ReacoesFlutuantes } from "./reacoes-flutuantes";
import type { ParticipantId } from "@/lib/socket-events";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoTileProps {
  stream: MediaStream;
  nome: string;
  /** Sem áudio local: a própria tela ("Você"), pra não dar eco. Também esconde volume/estatísticas. */
  mudo?: boolean;
  /** Lê a foto das estatísticas de recepção de `participanteId` — só pra quem assiste. */
  estatisticasDe?: (id: ParticipantId) => Promise<EstatisticasVideo | null>;
  participanteId?: ParticipantId;
  /** Estado da conexão que traz este vídeo — só pra quem assiste. Sem ele, tela preta não explica nada. */
  conexao?: EstadoConexao;
  /** Chat mostrado sobreposto ao vídeo enquanto está em tela cheia. */
  chat?: ReactNode;
  /** Botão de destacar/ver todas (só existe com 2+ telas). */
  destaque?: { ativo: boolean; alternar: () => void };
  /** Reações em andamento — mostradas aqui só em tela cheia (fora dela a sala as mostra). */
  reacoes?: ReacoesStore;
  className?: string;
}

// Eventos que a sala manda pro tile em atalhos de teclado (`F`, `M`, `/`) —
// o tile é quem sabe seu próprio vídeo/estado.
export const EVENTO_TELA_CHEIA = "sinal:tela-cheia";
export const EVENTO_MUDO = "sinal:mudo";
export const EVENTO_ABRIR_CHAT = "sinal:abrir-chat";
export const EVENTO_PIP = "sinal:pip";

// Botões de ícone puro sobre o vídeo (sem fundo), legíveis por sombra. No
// toque a área sobe pra 44px (o ícone continua pequeno): 28px é difícil de
// acertar com o dedo.
const BOTAO_ICONE =
  "flex size-7 items-center justify-center text-white/80 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] hover:text-white focus-visible:outline-2 focus-visible:outline-ring [@media(hover:none)]:size-11";

/** Solta o vídeo numa janelinha flutuante (ou volta), onde o navegador suporta. */
function alternarPip(video: HTMLVideoElement | null) {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  } else {
    video?.requestPictureInPicture?.().catch(() => {});
  }
}

function formatarEstatisticas(atual: EstatisticasVideo, anterior: EstatisticasVideo | null) {
  if (!atual.altura) return null;
  const partes = [`${atual.altura}p`, `${Math.round(atual.fps)} fps`];
  if (anterior && atual.em > anterior.em) {
    const mbps = ((atual.bytes - anterior.bytes) * 8) / ((atual.em - anterior.em) * 1000);
    partes.push(`${mbps.toFixed(1).replace(".", ",")} Mbps`);
  }
  return partes.join(" · ");
}

export function VideoTile({
  stream,
  nome,
  mudo,
  estatisticasDe,
  participanteId,
  conexao,
  chat,
  destaque,
  reacoes,
  className,
}: VideoTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  const [volume, setVolume] = useState(1);
  const [silenciado, setSilenciado] = useState(false);
  const [estatisticas, setEstatisticas] = useState<string | null>(null);
  const [chatAberto, setChatAberto] = useState(false);
  // Proporção real do vídeo (16:9 até chegar o primeiro quadro): o tile se
  // ajusta a ela pra o canto arredondado ficar na imagem, e não num quadro
  // preto maior em volta dela.
  const [proporcao, setProporcao] = useState(16 / 9);
  const [emPip, setEmPip] = useState(false);
  // Em tela cheia, sem mexer o mouse por 3s os controles e o cursor somem.
  const [ocioso, setOcioso] = useState(false);
  // Já chegou o primeiro quadro? Até lá "conectando" é o que explica o preto.
  const [temImagem, setTemImagem] = useState(false);
  // O navegador barrou o autoplay COM som (acontece sem toque prévio na
  // página, ex.: recarregou direto na sala): toca mudo e oferece ativar.
  const [somBloqueado, setSomBloqueado] = useState(false);
  const pipDisponivel = typeof document !== "undefined" && document.pictureInPictureEnabled;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    function aoMedir() {
      if (video && video.videoWidth && video.videoHeight) {
        setProporcao(video.videoWidth / video.videoHeight);
      }
    }
    function aoTerImagem() {
      setTemImagem(true);
    }
    video.addEventListener("loadedmetadata", aoMedir);
    video.addEventListener("resize", aoMedir);
    video.addEventListener("loadeddata", aoTerImagem);

    // `autoPlay` sozinho falha em silêncio quando o navegador barra som sem
    // toque prévio — e o resultado é um vídeo preto parado.
    video.play().catch((erro: unknown) => {
      if ((erro as { name?: string })?.name !== "NotAllowedError") return;
      video.muted = true;
      setSilenciado(true);
      setSomBloqueado(true);
      video.play().catch(() => {});
    });

    return () => {
      video.removeEventListener("loadedmetadata", aoMedir);
      video.removeEventListener("resize", aoMedir);
      video.removeEventListener("loadeddata", aoTerImagem);
    };
  }, [stream]);

  // Volume/mudo são só do meu lado (não afetam ninguém) e valem por tela.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = !!mudo || silenciado;
  }, [volume, silenciado, mudo]);

  useEffect(() => {
    // Celular pausa o <video> quando o app vai pro segundo plano e o
    // `autoPlay` não retoma sozinho na volta.
    function retomar() {
      if (document.visibilityState === "visible") {
        videoRef.current?.play().catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", retomar);
    return () => document.removeEventListener("visibilitychange", retomar);
  }, []);

  useEffect(() => {
    function aoMudarTelaCheia() {
      const cheia = document.fullscreenElement === containerRef.current;
      setEmTelaCheia(cheia);
      setOcioso(false);
      if (!cheia) {
        screen.orientation?.unlock?.();
        setChatAberto(false);
      }
    }
    document.addEventListener("fullscreenchange", aoMudarTelaCheia);
    return () => document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const entrou = () => setEmPip(true);
    const saiu = () => setEmPip(false);
    video.addEventListener("enterpictureinpicture", entrou);
    video.addEventListener("leavepictureinpicture", saiu);
    return () => {
      video.removeEventListener("enterpictureinpicture", entrou);
      video.removeEventListener("leavepictureinpicture", saiu);
    };
  }, []);

  // Esconde os controles depois de 3s parado em tela cheia; qualquer
  // movimento, toque ou tecla traz de volta e recomeça a contagem.
  useEffect(() => {
    const container = containerRef.current;
    if (!emTelaCheia || !container) return;
    let timer = setTimeout(() => setOcioso(true), 3000);
    function agitar() {
      setOcioso(false);
      clearTimeout(timer);
      timer = setTimeout(() => setOcioso(true), 3000);
    }
    const eventos = ["mousemove", "pointerdown", "touchstart", "keydown"] as const;
    for (const e of eventos) container.addEventListener(e, agitar);
    return () => {
      for (const e of eventos) container.removeEventListener(e, agitar);
      clearTimeout(timer);
    };
  }, [emTelaCheia]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const pip = () => alternarPip(videoRef.current);
    const telaCheia = () => alternarTelaCheia(container, videoRef.current);
    const alternarMudo = () => setSilenciado((s) => !s);
    const abrirChat = () => {
      // Síncrono: o campo precisa existir no DOM pra receber o foco já.
      flushSync(() => setChatAberto(true));
      container.querySelector<HTMLInputElement>("[data-chat-input]")?.focus();
    };
    container.addEventListener(EVENTO_PIP, pip);
    container.addEventListener(EVENTO_TELA_CHEIA, telaCheia);
    container.addEventListener(EVENTO_MUDO, alternarMudo);
    container.addEventListener(EVENTO_ABRIR_CHAT, abrirChat);
    return () => {
      container.removeEventListener(EVENTO_PIP, pip);
      container.removeEventListener(EVENTO_TELA_CHEIA, telaCheia);
      container.removeEventListener(EVENTO_MUDO, alternarMudo);
      container.removeEventListener(EVENTO_ABRIR_CHAT, abrirChat);
    };
  }, []);

  // Estatísticas de recepção a cada 2s (só com a aba visível): o bitrate é a
  // diferença de bytes entre duas fotos.
  useEffect(() => {
    if (!estatisticasDe || !participanteId) return;
    let ativo = true;
    let anterior: EstatisticasVideo | null = null;

    async function ler() {
      if (document.hidden) return;
      const foto = await estatisticasDe!(participanteId!).catch(() => null);
      if (!ativo || !foto) return;
      setEstatisticas(formatarEstatisticas(foto, anterior));
      anterior = foto;
    }

    ler();
    const id = setInterval(ler, 2000);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [estatisticasDe, participanteId]);

  // Com o chat aberto os controles ficam (a pessoa está digitando).
  const ocultar = emTelaCheia && ocioso && !chatAberto;
  const tocaSom = !mudo;
  const volumeMostrado = silenciado ? 0 : volume;

  // O que dizer sobre a conexão (null = nada, o vídeo fala por si).
  const avisoConexao =
    conexao === "falhou"
      ? ({ tipo: "falhou" } as const)
      : conexao === "instavel"
        ? ({ tipo: "instavel" } as const)
        : conexao === "conectando" && !temImagem
          ? ({ tipo: "conectando" } as const)
          : null;

  function ativarSom() {
    const video = videoRef.current;
    setSomBloqueado(false);
    setSilenciado(false);
    if (video) {
      video.muted = false;
      video.play().catch(() => {});
    }
  }

  return (
    <div
      ref={containerRef}
      data-video-tile
      data-remoto={tocaSom ? "" : undefined}
      data-ocultar={ocultar ? "" : undefined}
      style={{ "--proporcao": proporcao } as React.CSSProperties}
      // Duplo toque/clique no vídeo alterna tela cheia — o botão do canto é
      // pequeno pra acertar com o dedo. `touch-manipulation` tira o zoom de
      // duplo toque do navegador, que roubaria o gesto.
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, input, [data-chat-input]")) {
          alternarTelaCheia(containerRef.current, videoRef.current);
        }
      }}
      className={cn(
        // Celular: 16:9 na largura toda. Desktop: a maior caixa com a
        // proporção do vídeo que cabe na célula (`cqw`/`cqh` = tamanho do
        // envoltório em `sala-client`), centralizada por ele.
        "touch-manipulation aspect-video md:aspect-(--proporcao) md:w-[min(100cqw,calc(100cqh*var(--proporcao)))]",
        // Canto arredondado sem borda: a separação do vazio ao redor vem da
        // própria imagem contra o preto (ver DESIGN.md). Em tela cheia o
        // canto some, senão aparece um vão preto nos quatro cantos.
        "group relative overflow-hidden rounded-2xl bg-black data-[ocultar]:cursor-none",
        emTelaCheia && "flex items-center justify-center rounded-none",
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={mudo}
        className={cn("h-full w-full object-contain", emTelaCheia && "h-auto max-h-full")}
      />

      {avisoConexao && (
        <div
          role="status"
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center",
            // Com imagem congelada por baixo, escurece pra o texto ler.
            temImagem && "bg-black/60"
          )}
        >
          {avisoConexao.tipo === "falhou" ? (
            <>
              <WifiOff className="size-5 text-destructive" aria-hidden />
              <p className="text-sm font-medium text-white">
                Não foi possível conectar com {nome}
              </p>
              <p className="max-w-xs text-xs text-white/70">
                Algo na rede de um dos dois bloqueia a conexão direta: firewall, VPN ou
                gerenciador de portas, 4G ou rede de trabalho. Desligue o que puder; se
                não resolver, quem hospeda pode ligar um servidor TURN (veja o README).
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-white/80">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
              {avisoConexao.tipo === "instavel"
                ? `Conexão com ${nome} instável…`
                : `Conectando com ${nome}…`}
            </p>
          )}
        </div>
      )}

      {somBloqueado && (
        <button
          type="button"
          onClick={ativarSom}
          className="absolute bottom-3 left-1/2 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 text-sm text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <VolumeX className="size-4" aria-hidden />
          Tocar com som
        </button>
      )}

      {emTelaCheia && reacoes && <ReacoesFlutuantes reacoes={reacoes} />}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 to-transparent transition-opacity group-data-[ocultar]:opacity-0" />

      {/* Legenda sem pílula/fundo — texto direto sobre o gradiente, como uma
          linha de crédito de abertura (ver DESIGN.md, "Fila de Créditos"). */}
      <div className="absolute top-2.5 left-3 flex items-center gap-2 transition-opacity group-data-[ocultar]:opacity-0">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        <span className="font-heading text-xs tracking-wide text-white">{nome}</span>
      </div>

      <div className="absolute top-2 right-2.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-data-[ocultar]:opacity-0! focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        {pipDisponivel && (
          <button
            type="button"
            onClick={() => alternarPip(videoRef.current)}
            aria-label={emPip ? "Sair da janela flutuante (P)" : "Janela flutuante (P)"}
            title={emPip ? "Sair da janela flutuante (P)" : "Janela flutuante (P)"}
            className={cn(BOTAO_ICONE, "hidden md:flex")}
          >
            <PictureInPicture2 className="size-4" />
          </button>
        )}

        {destaque && !emTelaCheia && (
          <button
            type="button"
            onClick={destaque.alternar}
            aria-label={destaque.ativo ? "Ver todas as telas" : "Destacar esta tela"}
            title={destaque.ativo ? "Ver todas as telas" : "Destacar esta tela"}
            className={cn(BOTAO_ICONE, "hidden md:flex")}
          >
            {destaque.ativo ? <LayoutGrid className="size-4" /> : <Pin className="size-4" />}
          </button>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => alternarTelaCheia(containerRef.current, videoRef.current)}
                className={BOTAO_ICONE}
              />
            }
          >
            {emTelaCheia ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
            <span className="sr-only">
              {emTelaCheia ? "Sair da tela cheia" : "Tela cheia"}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {emTelaCheia ? "Sair da tela cheia (F)" : "Tela cheia (F)"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Barra de baixo: volume (só onde tem mouse — no celular é o botão
          do aparelho), estatísticas de recepção e o botão do chat em tela
          cheia. Aparece no hover; no toque só sobra o que é útil lá. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 opacity-0 transition-opacity group-hover:opacity-100 group-data-[ocultar]:opacity-0! focus-within:opacity-100 [@media(hover:none)]:bg-none [@media(hover:none)]:opacity-100">
        {tocaSom && (
          <div className="hidden items-center gap-2 [@media(hover:hover)]:flex">
            <button
              type="button"
              onClick={() => setSilenciado((s) => !s)}
              className="flex size-6 items-center justify-center text-white/80 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={silenciado ? "Ativar som (M)" : "Silenciar (M)"}
              title={silenciado ? "Ativar som (M)" : "Silenciar (M)"}
            >
              {volumeMostrado === 0 ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volumeMostrado}
              onChange={(e) => {
                const novo = Number(e.target.value);
                setVolume(novo);
                setSilenciado(novo === 0);
              }}
              aria-label={`Volume de ${nome}`}
              className="h-1 w-20 cursor-pointer accent-primary"
            />
          </div>
        )}

        <div className="flex-1" />

        {estatisticas && tocaSom && (
          <span className="hidden font-mono text-xs text-white/70 tabular-nums [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] [@media(hover:hover)]:inline">
            {estatisticas}
          </span>
        )}

        {emTelaCheia && chat && (
          <button
            type="button"
            onClick={() => setChatAberto((a) => !a)}
            className="flex items-center gap-1.5 text-white/80 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] hover:text-white focus-visible:outline-2 focus-visible:outline-ring [@media(hover:none)]:min-h-11"
            aria-label={chatAberto ? "Fechar chat" : "Abrir chat (/)"}
            aria-expanded={chatAberto}
          >
            <MessageSquare className="size-4" />
            <span className="font-heading text-xs tracking-wide uppercase">Chat</span>
          </button>
        )}
      </div>

      {emTelaCheia && chat && chatAberto && (
        <div className="absolute top-14 right-3 bottom-14 flex w-80 max-w-[85%] flex-col rounded-2xl bg-popover p-3">
          <button
            type="button"
            onClick={() => setChatAberto(false)}
            className="mb-2 flex items-center justify-between font-heading text-xs tracking-wide text-muted-foreground uppercase hover:text-foreground"
            aria-label="Fechar chat"
          >
            Chat
            <X className="size-3.5" />
          </button>
          <div className="min-h-0 flex-1">{chat}</div>
        </div>
      )}
    </div>
  );
}
