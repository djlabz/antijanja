"use client";

import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Loader2, SquarePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdicionarFonteDialogProps {
  trigger: ReactNode;
  aoAdicionar: (
    link: string,
    qualquerUmControla: boolean
  ) => Promise<{ ok: true } | { ok: false; erro: string }>;
}

/**
 * Só YouTube por enquanto (foi o que foi pedido) — o player em si sincroniza
 * via `YoutubePlayer`. Ver docs/decisions.md (ADR 015) pra Twitch/Kick, que
 * o print de referência mostrava mas não foram implementados.
 */
export function AdicionarFonteDialog({ trigger, aoAdicionar }: AdicionarFonteDialogProps) {
  // Controlado + desmontado quando fechado — ver ADR 012 (bug do Dialog/Popover).
  const [aberto, setAberto] = useState(false);
  const [link, setLink] = useState("");
  const [qualquerUmControla, setQualquerUmControla] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setEnviando(true);
    setErro(null);
    const resposta = await aoAdicionar(link.trim(), qualquerUmControla);
    setEnviando(false);
    if (resposta.ok) {
      setAberto(false);
      setLink("");
    } else {
      setErro(resposta.erro);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) setErro(null);
      }}
    >
      <DialogTrigger render={trigger as ReactElement} />
      {aberto && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="secondary">BETA</Badge>
              Adicionar vídeo do YouTube
            </DialogTitle>
            <DialogDescription>
              Funciona como um controle remoto: todo mundo na sala assiste
              junto, sincronizado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={adicionar} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm">
              <SquarePlay className="size-4 text-primary" />
              YouTube
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Quem pode controlar
              </span>
              <RadioGroup
                value={qualquerUmControla ? "todos" : "so-eu"}
                onValueChange={(valor) => setQualquerUmControla(valor === "todos")}
                className="gap-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="so-eu" />
                  Só eu posso controlar
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="todos" />
                  Qualquer um pode controlar
                </label>
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="link-video" className="text-xs font-medium text-muted-foreground">
                Link
              </label>
              <Input
                id="link-video"
                placeholder="https://youtube.com/watch?v=... ou playlist"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                autoFocus
              />
              {erro && <p className="text-xs text-destructive">{erro}</p>}
            </div>

            <Button type="submit" disabled={!link.trim() || enviando} className="gap-1.5">
              {enviando && <Loader2 className="size-4 animate-spin" />}
              Adicionar
            </Button>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
