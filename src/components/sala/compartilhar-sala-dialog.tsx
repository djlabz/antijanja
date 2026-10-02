"use client";

import { useState } from "react";
import { Check, Copy, Link2, Lock, LockOpen, Share2 } from "lucide-react";
import { useCompartilharNativo, useCopiar, useLinkSala } from "@/hooks/use-link-sala";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CompartilharSalaDialogProps {
  codigo: string;
  /**
   * URL pública do túnel do Cloudflare, quando o servidor sobe com um (ver
   * `useSala`/`server.ts`). Tem prioridade sobre a origem do navegador:
   * quem hospeda a sala normalmente abre `localhost` no próprio navegador,
   * então sem isso o link gerado seria um `localhost` inútil pros amigos de
   * fora — ver docs/decisions.md (ADR 011).
   */
  linkPublico?: string | null;
  /** A sala está trancada (ninguém novo entra)? */
  trancada?: boolean;
  aoAlternarTranca?: () => void;
}

/**
 * Um único link que já leva direto pra sala — em vez de "entre nesse link e
 * digite esse código", como pedido (ver `useLinkSala`).
 */
export function CompartilharSalaDialog({
  codigo,
  linkPublico,
  trancada = false,
  aoAlternarTranca,
}: CompartilharSalaDialogProps) {
  // Controlado explicitamente, E o conteúdo só é renderizado quando aberto
  // (`{aberto && <DialogContent>...}`, mais abaixo) — por causa de um bug
  // real visto neste componente Shadcn/base-ui: ao fechar, o
  // overlay/conteúdo ficava preso na tela em opacidade total, ainda
  // clicável, travando o resto do app (a transição de saída nunca parecia
  // terminar de verdade, mesmo com `data-closed` correto no DOM). Desmontar
  // o conteúdo de propósito é mais bruto que confiar na animação de saída
  // da biblioteca, mas garante que ele suma de verdade. Ver docs/decisions.md
  // (ADR 012).
  const [aberto, setAberto] = useState(false);
  const link = useLinkSala(linkPublico);
  const { copiado, copiar } = useCopiar(link);
  const { disponivel: podeCompartilhar, compartilhar } = useCompartilharNativo(link);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          // Copia assim que abre — não precisa clicar em nada a mais pra
          // levar o link pra área de transferência, como pedido.
          <Button size="sm" className="gap-1.5" onClick={copiar} />
        }
      >
        <Link2 className="size-3.5" />
        <span className="max-sm:sr-only">Compartilhar sala</span>
      </DialogTrigger>
      {aberto && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convide seus amigos</DialogTitle>
            <DialogDescription>
              Quem abrir esse link entra direto nesta sala — não precisa
              digitar nome de sala nem código.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 flex-1 rounded-full border border-input bg-input/30 px-4 font-mono text-xs text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button
              type="button"
              size="icon-sm"
              variant={copiado ? "default" : "outline"}
              onClick={copiar}
              aria-label="Copiar link"
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>

          {podeCompartilhar && (
            <Button type="button" className="w-full" onClick={compartilhar}>
              <Share2 className="size-4" />
              Compartilhar…
            </Button>
          )}

          {aoAlternarTranca && (
            <div className="flex items-start gap-3 rounded-2xl bg-white/[0.04] p-3">
              <div className="flex-1 text-xs text-muted-foreground">
                <p className="text-sm text-foreground">
                  {trancada ? "Sala trancada" : "Trancar sala"}
                </p>
                {trancada
                  ? "Ninguém novo consegue entrar, nem com o link. Quem já está dentro (ou volta de uma queda) não é afetado."
                  : "Todo mundo que você queria já entrou? Tranque pra ninguém de fora entrar com o link."}
              </div>
              <Button
                type="button"
                size="sm"
                variant={trancada ? "default" : "outline"}
                className="gap-1.5"
                onClick={aoAlternarTranca}
              >
                {trancada ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                {trancada ? "Destrancar" : "Trancar"}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Código da sala: <span className="font-mono text-foreground">{codigo}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {linkPublico
              ? "Link público (túnel do Cloudflare) — funciona pra qualquer amigo, de qualquer rede."
              : "Link só da sua rede local — pra amigos de fora, rode com npm run share ou docker compose up."}
          </p>
        </DialogContent>
      )}
    </Dialog>
  );
}
