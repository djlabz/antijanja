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
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-black",
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

      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />

      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 py-1 pr-2.5 pl-1.5 backdrop-blur-sm">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        <span className="text-xs font-medium text-white">{nome}</span>
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={alternarTelaCheia}
              className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-ring"
            />
          }
        >
          {emTelaCheia ? (
            <Minimize className="size-3.5" />
          ) : (
            <Maximize className="size-3.5" />
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
