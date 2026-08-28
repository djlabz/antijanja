"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, Link2 } from "lucide-react";
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
}

/**
 * Um único link que já leva direto pra sala — em vez de "entre nesse link e
 * digite esse código", como pedido. Funciona tanto em localhost quanto atrás
 * do túnel do Cloudflare porque a origem vem de `window.location`, mas o
 * caminho vem de `usePathname()` — NÃO de `window.location.href` direto:
 * numa navegação client-side do Next (ex: preencher o formulário em "/" e
 * cair aqui), o componente pode montar num instante em que `location.href`
 * ainda reflete a rota anterior, gerando um link errado (bug real, visto e
 * corrigido durante o desenvolvimento — ver docs/decisions.md, ADR 009).
 * `usePathname()` é o hook do próprio Next e sempre reflete a rota atual.
 */
export function CompartilharSalaDialog({ codigo }: CompartilharSalaDialogProps) {
  const caminho = usePathname();
  // A origem (protocolo+host) não muda durante a sessão, então ler uma vez
  // no mount é seguro — é só o caminho que precisa vir de `usePathname()`.
  const [origem] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : ""
  );
  const link = origem ? `${origem}${caminho}` : "";
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível (ex: http sem permissão) — o campo continua
      // selecionável pra copiar manualmente.
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Link2 className="size-3.5" />
        <span className="hidden sm:inline">Compartilhar sala</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convide seus amigos</DialogTitle>
          <DialogDescription>
            Quem abrir esse link entra direto nesta sala — não precisa digitar
            nome de sala nem código.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="h-9 flex-1 rounded-lg border border-input bg-input/30 px-2.5 font-mono text-xs text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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

        <p className="text-xs text-muted-foreground">
          Código da sala: <span className="font-mono text-foreground">{codigo}</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
