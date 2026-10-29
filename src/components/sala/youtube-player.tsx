"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGrid, Pin, SkipForward, SquarePlay, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { acabouODoItem } from "@/lib/fila-video";
import type { ComandoVideo, ItemFila, ParticipantId } from "@/lib/socket-events";

interface YoutubePlayerProps {
  /** O que está tocando agora. Quando muda, o MESMO player carrega o novo (não remonta). */
  item: ItemFila;
  /** Quantos vídeos esperam depois deste. */
  naFila: number;
  /** Se true, este cliente manda play/pause e pula de vídeo (dono ou "qualquer um controla"). */
  souControlador: boolean;
  /** Quem abriu o player manda o "heartbeat" de sincronia — um só, pra não brigarem. */
  souDono: boolean;
  ultimoComando: (ComandoVideo & { de: ParticipantId }) | null;
  onComando: (comando: ComandoVideo) => void;
  /** Passa pro próximo; recebe o id do item que acabou, pro servidor ignorar pedido repetido. */
  onAvancar: (itemId: number) => void;
  onRemover?: () => void;
  /** Botão de destacar/ver todas (só existe com 2+ telas). */
  destaque?: { ativo: boolean; alternar: () => void };
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
 * Por quanto tempo os eventos do player são ignorados depois de EU mexer nele
 * por ordem de outra pessoa. O YouTube ainda emite "buffering"/"pausado" por
 * uns 500–700ms depois de um seek; com janela menor esse eco voltava como
 * comando novo e podia desfazer um play/pause que alguém acabou de dar.
 */
const SILENCIO_MS = 1000;

/** Botão de ícone puro sobre o vídeo: só no hover (sempre visível, e maior, no toque). */
const BOTAO_SOBRE_VIDEO =
  "flex size-7 items-center justify-center text-white/80 opacity-0 transition-opacity [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.8))] group-hover:opacity-100 hover:text-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring [@media(hover:none)]:size-11 [@media(hover:none)]:opacity-100";

/**
 * Player de YouTube sincronizado entre todo mundo na sala — não é
 * compartilhamento de tela, é um "controle remoto" só de quem tem
 * permissão (ver docs/decisions.md, ADR 015). Sincronização por comandos
 * (tocar/pausar) mais um "heartbeat" a cada 5s do dono, pra corrigir desvio
 * de quem só assiste — não é sincronia quadro a quadro.
 *
 * A fila (ADR 037) vive no servidor: este componente só toca o item `item` e,
 * quando ele termina (ou não dá pra reproduzir), quem controla pede o próximo.
 */
export function YoutubePlayer({
  item,
  naFila,
  souControlador,
  souDono,
  ultimoComando,
  onComando,
  onAvancar,
  onRemover,
  destaque,
}: YoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [pronto, setPronto] = useState(false);
  const [pulou, setPulou] = useState(false);
  // Até quando os eventos do player são "eco" de uma ordem que eu apliquei.
  const ignorarAte = useRef(0);
  // Qual item o iframe tem carregado agora (pode atrasar em relação a `item`).
  const carregado = useRef(item.id);

  // O player é criado uma vez e vive várias trocas de vídeo, então os
  // callbacks dele precisam enxergar sempre o valor mais novo, não o do
  // momento em que foram criados. Vem ANTES do efeito que cria o player.
  const atual = useRef({ item, naFila, souControlador, onComando, onAvancar });
  useEffect(() => {
    atual.current = { item, naFila, souControlador, onComando, onAvancar };
  });

  const emSilencio = () => Date.now() < ignorarAte.current;
  const silenciar = () => {
    ignorarAte.current = Date.now() + SILENCIO_MS;
  };

  useEffect(() => {
    let cancelado = false;
    carregarApiYoutube().then(() => {
      if (cancelado || !containerRef.current || !window.YT) return;
      const inicial = atual.current.item;
      carregado.current = inicial.id;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: inicial.ehPlaylist ? undefined : inicial.youtubeId,
        playerVars: inicial.ehPlaylist
          ? { listType: "playlist", list: inicial.youtubeId }
          : {},
        events: {
          onReady: () => setPronto(true),
          onStateChange: (evento) => {
            const p = playerRef.current;
            const { item: tocando, souControlador: controlo, onComando: mandar, onAvancar: avancar } =
              atual.current;
            if (!p || !controlo) return;
            const estados = window.YT!.PlayerState;

            if (evento.data === estados.ENDED) {
              // Todos os controladores chegam aqui juntos; o servidor pula um só.
              if (acabouODoItem(tocando.ehPlaylist, p.getPlaylist(), p.getPlaylistIndex())) {
                avancar(tocando.id);
              }
              return;
            }
            // Estado gerado por uma ordem de OUTRA pessoa que eu apliquei
            // (ou por eu carregar o próximo vídeo): se eu reenviasse, viraria
            // eco — eu recebo, aplico, isso dispara onStateChange, e reenvio.
            if (emSilencio()) return;
            if (evento.data === estados.PLAYING) {
              mandar({ tipo: "tocar", emSegundos: p.getCurrentTime() });
            } else if (evento.data === estados.PAUSED) {
              mandar({ tipo: "pausar", emSegundos: p.getCurrentTime() });
            }
          },
          onError: () => {
            const { item: tocando, naFila: restam, souControlador: controlo, onAvancar: avancar } =
              atual.current;
            // Vídeo privado/apagado/sem permissão de embutir: com algo na fila,
            // a sala não pode ficar presa nele. (Numa playlist o erro é de UM
            // vídeo dela, não do item inteiro — aí o próprio YouTube lida.)
            if (tocando.ehPlaylist || restam === 0) return;
            setPulou(true);
            if (controlo) avancar(tocando.id);
          },
        },
      });
    });

    return () => {
      cancelado = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // A fila andou: o mesmo player carrega o próximo (sem remontar o iframe,
  // então tela cheia e volume continuam). Começa a tocar sozinho.
  useEffect(() => {
    const p = playerRef.current;
    if (!pronto || !p || carregado.current === item.id) return;
    carregado.current = item.id;
    silenciar();
    if (item.ehPlaylist) p.loadPlaylist({ list: item.youtubeId });
    else p.loadVideoById(item.youtubeId);
  }, [item.id, item.youtubeId, item.ehPlaylist, pronto]);

  // Aplica os comandos de OUTRA pessoa que controla — o servidor nunca manda
  // de volta os meus. Vale também pra quem controla: com "qualquer um
  // controla" todo mundo é controlador, e se todos ignorassem os comandos dos
  // outros ninguém ficaria em sincronia.
  useEffect(() => {
    const p = playerRef.current;
    if (!ultimoComando || !p || !pronto) return;

    switch (ultimoComando.tipo) {
      case "tocar":
        silenciar();
        if (Math.abs(p.getCurrentTime() - ultimoComando.emSegundos) > 1) {
          p.seekTo(ultimoComando.emSegundos, true);
        }
        p.playVideo();
        break;
      case "pausar":
        silenciar();
        p.seekTo(ultimoComando.emSegundos, true);
        p.pauseVideo();
        break;
      case "sincronizar": {
        // O heartbeat chega a cada 5s e quase sempre não muda nada; se ele
        // também abrisse a janela de silêncio, engoliria um play/pause que
        // eu desse nesse meio tempo. Só silencia quando de fato mexe no player.
        const distante = Math.abs(p.getCurrentTime() - ultimoComando.emSegundos) > 2;
        const tocandoAgora = p.getPlayerState() === window.YT?.PlayerState.PLAYING;
        if (distante || tocandoAgora !== ultimoComando.tocando) silenciar();
        if (distante) p.seekTo(ultimoComando.emSegundos, true);
        if (ultimoComando.tocando) p.playVideo();
        else p.pauseVideo();
        break;
      }
    }
  }, [ultimoComando, pronto]);

  // Heartbeat do dono — corrige desvio de quem só assiste. Só um manda: com
  // vários controladores, todos corrigindo uns aos outros ficariam brigando.
  useEffect(() => {
    if (!souDono) return;
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
  }, [souDono, pronto, onComando]);

  // O aviso de "pulei" some sozinho.
  useEffect(() => {
    if (!pulou) return;
    const id = setTimeout(() => setPulou(false), 4000);
    return () => clearTimeout(id);
  }, [pulou]);

  const podePular = souControlador && naFila > 0;

  return (
    <div className="group relative aspect-video overflow-hidden rounded-2xl bg-black md:w-[min(100cqw,calc(100cqh*16/9))]">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
        <SquarePlay className="size-3.5 text-white" />
        <span className="font-heading text-xs tracking-wide text-white">
          {item.ehPlaylist ? "Playlist do YouTube" : "YouTube"}
        </span>
      </div>

      <div className="absolute top-2 right-2.5 flex items-center">
        {podePular && (
          <button
            type="button"
            onClick={() => onAvancar(item.id)}
            aria-label="Próximo vídeo"
            title="Próximo vídeo"
            className={BOTAO_SOBRE_VIDEO}
          >
            <SkipForward className="size-4" />
          </button>
        )}

        {destaque && (
          <button
            type="button"
            onClick={destaque.alternar}
            aria-label={destaque.ativo ? "Ver todas as telas" : "Destacar esta tela"}
            title={destaque.ativo ? "Ver todas as telas" : "Destacar esta tela"}
            className={cn(BOTAO_SOBRE_VIDEO, "max-md:hidden")}
          >
            {destaque.ativo ? <LayoutGrid className="size-4" /> : <Pin className="size-4" />}
          </button>
        )}

        {onRemover && (
          <button
            type="button"
            onClick={onRemover}
            // Sem hover no toque: fica sempre visível lá (e com área de 44px),
            // senão quem controla o vídeo não conseguia removê-lo pelo celular.
            className={BOTAO_SOBRE_VIDEO}
            aria-label="Fechar o player"
            title={naFila > 0 ? "Fechar o player e descartar a fila" : "Fechar o player"}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {pulou && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-3 bottom-3 mx-auto w-fit max-w-full rounded-full bg-black/75 px-3.5 py-1.5 text-center text-xs text-white"
        >
          Esse vídeo não pode ser reproduzido aqui. Passando pro próximo…
        </p>
      )}
    </div>
  );
}
