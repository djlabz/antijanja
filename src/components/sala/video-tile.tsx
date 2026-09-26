"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { MessageSquare, Maximize, Minimize, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { alternarTelaCheia } from "@/lib/tela-cheia";
import type { EstatisticasVideo } from "@/hooks/use-sala";
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
  /** Chat mostrado sobreposto ao vídeo enquanto está em tela cheia. */
  chat?: ReactNode;
  className?: string;
}

// Eventos que a sala manda pro tile em atalhos de teclado (`F`, `M`, `/`) —
// o tile é quem sabe seu próprio vídeo/estado.
export const EVENTO_TELA_CHEIA = "sinal:tela-cheia";
export const EVENTO_MUDO = "sinal:mudo";
export const EVENTO_ABRIR_CHAT = "sinal:abrir-chat";

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
  chat,
  className,
}: VideoTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  const [volume, setVolume] = useState(1);
  const [silenciado, setSilenciado] = useState(false);
  const [estatisticas, setEstatisticas] = useState<string | null>(null);
  const [chatAberto, setChatAberto] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
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
      if (!cheia) {
        screen.orientation?.unlock?.();
        setChatAberto(false);
      }
    }
    document.addEventListener("fullscreenchange", aoMudarTelaCheia);
    return () => document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const telaCheia = () => alternarTelaCheia(container, videoRef.current);
    const alternarMudo = () => setSilenciado((s) => !s);
    const abrirChat = () => {
      // Síncrono: o campo precisa existir no DOM pra receber o foco já.
      flushSync(() => setChatAberto(true));
      container.querySelector<HTMLInputElement>("[data-chat-input]")?.focus();
    };
    container.addEventListener(EVENTO_TELA_CHEIA, telaCheia);
    container.addEventListener(EVENTO_MUDO, alternarMudo);
    container.addEventListener(EVENTO_ABRIR_CHAT, abrirChat);
    return () => {
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

  const tocaSom = !mudo;
  const volumeMostrado = silenciado ? 0 : volume;

  return (
    <div
      ref={containerRef}
      data-video-tile
      data-remoto={tocaSom ? "" : undefined}
      // Duplo toque/clique no vídeo alterna tela cheia — o botão do canto é
      // pequeno pra acertar com o dedo. `touch-manipulation` tira o zoom de
      // duplo toque do navegador, que roubaria o gesto.
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, input, [data-chat-input]")) {
          alternarTelaCheia(containerRef.current, videoRef.current);
        }
      }}
      className={cn(
        "touch-manipulation aspect-video md:aspect-auto",
        // Sem borda, sem canto arredondado: o plano da frente é o vídeo em
        // si, não uma moldura ao redor dele (ver DESIGN.md). A separação do
        // vazio ao redor vem só da própria imagem contra o preto puro.
        "group relative overflow-hidden bg-black",
        emTelaCheia && "flex items-center justify-center",
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

      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 to-transparent" />

      {/* Legenda sem pílula/fundo — texto direto sobre o gradiente, como uma
          linha de crédito de abertura (ver DESIGN.md, "Fila de Créditos"). */}
      <div className="absolute top-2.5 left-3 flex items-center gap-2">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        <span className="font-heading text-xs tracking-wide text-white">{nome}</span>
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => alternarTelaCheia(containerRef.current, videoRef.current)}
              className="absolute top-2 right-2.5 flex size-7 items-center justify-center text-white/80 opacity-0 transition-opacity [@media(hover:none)]:opacity-100 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] group-hover:opacity-100 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
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

      {/* Barra de baixo: volume (só onde tem mouse — no celular é o botão
          do aparelho), estatísticas de recepção e o botão do chat em tela
          cheia. Aparece no hover; no toque só sobra o que é útil lá. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:bg-none [@media(hover:none)]:opacity-100">
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
            className="flex items-center gap-1.5 text-white/80 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={chatAberto ? "Fechar chat" : "Abrir chat (/)"}
            aria-expanded={chatAberto}
          >
            <MessageSquare className="size-4" />
            <span className="font-heading text-[11px] tracking-wide uppercase">Chat</span>
          </button>
        )}
      </div>

      {emTelaCheia && chat && chatAberto && (
        <div className="absolute top-14 right-3 bottom-14 flex w-80 max-w-[85%] flex-col bg-popover p-3">
          <button
            type="button"
            onClick={() => setChatAberto(false)}
            className="mb-2 flex items-center justify-between font-heading text-[11px] tracking-wide text-muted-foreground uppercase hover:text-foreground"
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
