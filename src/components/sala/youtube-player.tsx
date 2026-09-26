"use client";

import { useEffect, useRef, useState } from "react";
import { SquarePlay, X } from "lucide-react";
import type { ComandoVideo, ParticipantId } from "@/lib/socket-events";

interface YoutubePlayerProps {
  youtubeId: string;
  ehPlaylist: boolean;
  /** Se true, este cliente é quem manda comandos (dono ou "qualquer um controla"). */
  souControlador: boolean;
  ultimoComando: (ComandoVideo & { de: ParticipantId }) | null;
  onComando: (comando: ComandoVideo) => void;
  onRemover?: () => void;
}

let promessaApi: Promise<void> | null = null;

/** Carrega a IFrame API do YouTube uma vez só, mesmo com vários players na página. */
function carregarApiYoutube(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (promessaApi) return promessaApi;

  promessaApi = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return promessaApi;
}

/**
 * Player de YouTube sincronizado entre todo mundo na sala — não é
 * compartilhamento de tela, é um "controle remoto" só de quem tem
 * permissão (ver docs/decisions.md, ADR 015). Sincronização por comandos
 * (tocar/pausar/carregar) mais um "heartbeat" a cada 5s de quem controla,
 * pra corrigir desvio de quem só assiste — não é sincronia quadro a quadro.
 */
export function YoutubePlayer({
  youtubeId,
  ehPlaylist,
  souControlador,
  ultimoComando,
  onComando,
  onRemover,
}: YoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [pronto, setPronto] = useState(false);
  const aplicandoComandoRemoto = useRef(false);

  useEffect(() => {
    let cancelado = false;
    // Não reseta `pronto` aqui (setState direto no corpo do efeito) — o
    // componente pai usa `key={youtubeId}` (`sala-client.tsx`) pra remontar
    // do zero quando a fonte muda, o que já reinicia `pronto` sozinho.
    carregarApiYoutube().then(() => {
      if (cancelado || !containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: ehPlaylist ? undefined : youtubeId,
        playerVars: ehPlaylist
          ? { listType: "playlist", list: youtubeId }
          : {},
        events: {
          onReady: () => setPronto(true),
          onStateChange: (evento) => {
            // Ignora estado gerado por um comando que EU mesmo apliquei
            // vindo de outra pessoa — senão vira eco (eu recebo, aplico,
            // isso dispara onStateChange, e eu reenvio o mesmo comando).
            if (!souControlador || aplicandoComandoRemoto.current) return;
            const p = playerRef.current;
            if (!p) return;
            if (evento.data === window.YT!.PlayerState.PLAYING) {
              onComando({ tipo: "tocar", emSegundos: p.getCurrentTime() });
            } else if (evento.data === window.YT!.PlayerState.PAUSED) {
              onComando({ tipo: "pausar", emSegundos: p.getCurrentTime() });
            }
          },
        },
      });
    });

    return () => {
      cancelado = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId, ehPlaylist]);

  // Aplica os comandos de quem controla — nunca os que eu mesmo mandei
  // (evita eco; e se EU controlo, meu player já está no estado certo).
  useEffect(() => {
    const p = playerRef.current;
    if (!ultimoComando || souControlador || !p || !pronto) return;

    aplicandoComandoRemoto.current = true;
    switch (ultimoComando.tipo) {
      case "tocar":
        if (Math.abs(p.getCurrentTime() - ultimoComando.emSegundos) > 1) {
          p.seekTo(ultimoComando.emSegundos, true);
        }
        p.playVideo();
        break;
      case "pausar":
        p.seekTo(ultimoComando.emSegundos, true);
        p.pauseVideo();
        break;
      case "sincronizar":
        if (Math.abs(p.getCurrentTime() - ultimoComando.emSegundos) > 2) {
          p.seekTo(ultimoComando.emSegundos, true);
        }
        if (ultimoComando.tocando) p.playVideo();
        else p.pauseVideo();
        break;
      case "carregar":
        if (ultimoComando.ehPlaylist) p.loadPlaylist({ list: ultimoComando.youtubeId });
        else p.loadVideoById(ultimoComando.youtubeId);
        break;
    }
    // Solta a trava depois do tick atual — dá tempo do onStateChange (se
    // disparar por causa do seekTo/play/pause acima) ver a trava ligada.
    setTimeout(() => {
      aplicandoComandoRemoto.current = false;
    }, 0);
  }, [ultimoComando, souControlador, pronto]);

  // Heartbeat de quem controla — corrige desvio de quem só assiste.
  useEffect(() => {
    if (!souControlador) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || !pronto) return;
      onComando({
        tipo: "sincronizar",
        emSegundos: p.getCurrentTime(),
        tocando: p.getPlayerState() === window.YT?.PlayerState.PLAYING,
      });
    }, 5000);
    return () => clearInterval(id);
  }, [souControlador, pronto, onComando]);

  return (
    <div className="group relative aspect-video overflow-hidden bg-black md:aspect-auto">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
        <SquarePlay className="size-3.5 text-white" />
        <span className="font-heading text-xs tracking-wide text-white">
          {ehPlaylist ? "Playlist do YouTube" : "YouTube"}
        </span>
      </div>

      {onRemover && (
        <button
          type="button"
          onClick={onRemover}
          className="absolute top-2 right-2.5 flex size-7 items-center justify-center text-white/80 opacity-0 transition-opacity [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] group-hover:opacity-100 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Remover vídeo"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
