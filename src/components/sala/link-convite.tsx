"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompartilharNativo, useCopiar, useLinkSala } from "@/hooks/use-link-sala";

interface LinkConviteProps {
  linkPublico?: string | null;
}

/**
 * Link da sala numa pílula com botão de copiar — mostrado no estado vazio
 * quando a pessoa está sozinha, que é quando ela mais precisa dele.
 */
export function LinkConvite({ linkPublico }: LinkConviteProps) {
  const link = useLinkSala(linkPublico);
  const { copiado, copiar } = useCopiar(link);
  const { disponivel, compartilhar } = useCompartilharNativo(link);

  return (
    <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-input bg-input/30 py-1.5 pr-1.5 pl-4">
      <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-muted-foreground">
        {link}
      </span>
      {disponivel && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={compartilhar}
          aria-label="Compartilhar link"
        >
          <Share2 className="size-4" />
        </Button>
      )}
      <Button type="button" size="sm" onClick={copiar} className="shrink-0 gap-1.5">
        {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copiado ? "Copiado!" : "Copiar link"}
      </Button>
    </div>
  );
}
