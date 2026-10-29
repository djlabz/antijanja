"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpToLine, ListVideo, Play, Plus, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInfoYoutube } from "@/hooks/use-info-youtube";
import { miniaturaDoVideo } from "@/lib/youtube-info";
import { cn } from "@/lib/utils";
import type { AcaoFila, FonteVideo, ItemFila } from "@/lib/socket-events";
import { AdicionarFonteDialog, type AoAdicionarFonte } from "./adicionar-fonte-dialog";

interface FilaVideoProps {
  fonte: FonteVideo;
  /** Quem controla o vídeo também mexe na fila; os outros só acompanham. */
  podeControlar: boolean;
  /** Quem abriu o player — é a quem a pessoa sem controle é mandada pedir. */
  nomeDoDono: string;
  aoAcao: (tipo: AcaoFila, itemId: number) => void;
  aoAdicionar: AoAdicionarFonte;
}

function Miniatura({ item, url }: { item: ItemFila; url: string | null }) {
  const [quebrada, setQuebrada] = useState(false);
  return (
    <span className="relative flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.07]">
      {url && !quebrada ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura de terceiro, 64×36px: o otimizador do Next não ajuda
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setQuebrada(true)}
          className="size-full object-cover"
        />
      ) : (
        <ListVideo className="size-4 text-muted-foreground" aria-hidden />
      )}
      {item.ehPlaylist && url && !quebrada && (
        <span className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded bg-black/75 text-white">
          <ListVideo className="size-3" aria-hidden />
        </span>
      )}
    </span>
  );
}

function BotaoLinha({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

interface LinhaProps {
  item: ItemFila;
  tocandoAgora?: boolean;
  /** Botões da linha — só pra quem controla. */
  acoes?: ReactNode;
}

function Linha({ item, tocandoAgora, acoes }: LinhaProps) {
  const info = useInfoYoutube(item);
  const url = info?.miniatura ?? (item.ehPlaylist ? null : miniaturaDoVideo(item.youtubeId));
  const titulo =
    info?.titulo ??
    (info === undefined ? "Carregando…" : item.ehPlaylist ? "Playlist do YouTube" : "Vídeo do YouTube");
  const detalhe = [item.ehPlaylist ? "Playlist" : null, info?.autor, `por ${item.por}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="group/linha relative flex items-center gap-2.5 rounded-2xl p-1.5 transition-colors focus-within:bg-white/[0.04] hover:bg-white/[0.04]">
      <Miniatura item={item} url={url} />
      <div className="min-w-0 flex-1">
        <p
          title={titulo}
          className={cn(
            "line-clamp-2 text-sm leading-snug",
            // Profundidade = brilho (Depth-Is-State, DESIGN.md): o que toca agora
            // é o plano da frente; o resto espera atrás, na penumbra.
            tocandoAgora ? "font-medium text-dust-4" : "text-foreground/80",
            info === undefined && "text-muted-foreground"
          )}
        >
          {tocandoAgora && (
            <span
              aria-hidden
              className="mr-1.5 mb-px inline-block size-1.5 animate-pulse rounded-full bg-primary align-middle"
            />
          )}
          {titulo}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
      </div>
      {acoes && (
        // Computador: aparecem por cima do fim da linha ao passar o mouse ou
        // focar com o teclado. Toque (sem hover): ficam sempre visíveis, na linha.
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5 rounded-full bg-popover px-1 opacity-0 transition-opacity group-focus-within/linha:opacity-100 group-hover/linha:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:bg-transparent [@media(hover:none)]:px-0 [@media(hover:none)]:opacity-100">
          {acoes}
        </div>
      )}
    </li>
  );
}

/**
 * A fila do player do YouTube (ADR 037): o que toca agora e o que vem depois.
 * Quem controla o vídeo pula, toca na hora, adianta e tira; os outros só veem.
 */
export function FilaVideo({ fonte, podeControlar, nomeDoDono, aoAcao, aoAdicionar }: FilaVideoProps) {
  const { atual, proximos } = fonte;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <section aria-label="Tocando agora" className="flex flex-col gap-1">
        <h3 className="px-1.5 text-xs text-muted-foreground">Tocando agora</h3>
        <ul>
          <Linha
            item={atual}
            tocandoAgora
            acoes={
              podeControlar && proximos.length > 0 ? (
                <BotaoLinha rotulo="Pular pro próximo" onClick={() => aoAcao("avancar", atual.id)}>
                  <SkipForward />
                </BotaoLinha>
              ) : undefined
            }
          />
        </ul>
      </section>

      <section aria-label="A seguir" className="flex flex-col gap-1">
        <h3 className="px-1.5 text-xs text-muted-foreground">
          A seguir{proximos.length > 0 && ` · ${proximos.length}`}
        </h3>
        {proximos.length > 0 ? (
          <ol>
            {proximos.map((item, i) => (
              <Linha
                key={item.id}
                item={item}
                acoes={
                  podeControlar ? (
                    <>
                      <BotaoLinha rotulo="Tocar agora" onClick={() => aoAcao("tocar", item.id)}>
                        <Play />
                      </BotaoLinha>
                      {i > 0 && (
                        <BotaoLinha
                          rotulo="Tocar em seguida"
                          onClick={() => aoAcao("priorizar", item.id)}
                        >
                          <ArrowUpToLine />
                        </BotaoLinha>
                      )}
                      <BotaoLinha rotulo="Tirar da fila" onClick={() => aoAcao("remover", item.id)}>
                        <X />
                      </BotaoLinha>
                    </>
                  ) : undefined
                }
              />
            ))}
          </ol>
        ) : (
          <p className="px-1.5 py-1 text-sm text-muted-foreground">
            {podeControlar
              ? "Nada na fila. Adicione links pra tocar em seguida."
              : "Nada na fila por enquanto."}
          </p>
        )}
      </section>

      {podeControlar ? (
        <AdicionarFonteDialog
          modo="fila"
          aoAdicionar={aoAdicionar}
          trigger={
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <Plus className="size-3.5" />
              Adicionar à fila
            </Button>
          }
        />
      ) : (
        <p className="px-1.5 text-xs text-muted-foreground">
          Só {nomeDoDono} controla o vídeo e a fila.
        </p>
      )}
    </div>
  );
}
