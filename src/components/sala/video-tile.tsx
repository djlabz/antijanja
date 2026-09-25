"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoTileProps {
  stream: MediaStream;
  nome: string;
  mudo?: boolean;
  className?: string;
}

export function VideoTile({ stream, nome, mudo, className }: VideoTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [emTelaCheia, setEmTelaCheia] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    function aoMudarTelaCheia() {
      setEmTelaCheia(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", aoMudarTelaCheia);
    return () => document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
  }, []);

  function alternarTelaCheia() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const container = containerRef.current;
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (container?.requestFullscreen) {
      container.requestFullscreen().catch(() => {});
    } else {
      // iPhone/iOS Safari só deixa colocar o próprio <video> em tela cheia.
      video?.webkitEnterFullscreen?.();
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
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
              onClick={alternarTelaCheia}
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
          {emTelaCheia ? "Sair da tela cheia" : "Tela cheia"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
