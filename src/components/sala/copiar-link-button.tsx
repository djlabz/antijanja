"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopiar, useLinkSala } from "@/hooks/use-link-sala";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopiarLinkButtonProps {
  linkPublico?: string | null;
}

/**
 * Copia o link da sala com um clique, sem abrir o diálogo de convite — pra
 * quando só falta colar no Discord.
 */
export function CopiarLinkButton({ linkPublico }: CopiarLinkButtonProps) {
  const link = useLinkSala(linkPublico);
  const { copiado, copiar } = useCopiar(link);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={copiar}
            aria-label="Copiar link da sala"
          />
        }
      >
        {copiado ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
      </TooltipTrigger>
      <TooltipContent>{copiado ? "Link copiado!" : "Copiar link da sala"}</TooltipContent>
    </Tooltip>
  );
}
