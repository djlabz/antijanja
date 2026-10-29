"use client";

import { useRef, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Check, Loader2, SquarePlay } from "lucide-react";
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
import type { RespostaFonte } from "@/lib/socket-events";

export type AoAdicionarFonte = (
  link: string,
  qualquerUmControla: boolean
) => Promise<RespostaFonte>;

interface AdicionarFonteDialogProps {
  trigger: ReactNode;
  aoAdicionar: AoAdicionarFonte;
  /**
   * `iniciar`: não há player na sala — este vídeo abre um e quem adiciona decide
   * quem controla. `fila`: já há player — o vídeo entra no fim da fila, e o
   * diálogo fica aberto pra colar o próximo link (ADR 037).
   */
  modo?: "iniciar" | "fila";
}

function textoDaPosicao(naFila: number | undefined) {
  if (naFila === undefined) return "Adicionado.";
  return naFila === 1 ? "Entrou na fila: é o próximo." : `Entrou na fila: ${naFila}º a tocar.`;
}

/**
 * Só YouTube por enquanto (foi o que foi pedido) — o player em si sincroniza
 * via `YoutubePlayer`. Ver docs/decisions.md (ADR 015) pra Twitch/Kick, que
 * o print de referência mostrava mas não foram implementados.
 */
export function AdicionarFonteDialog({
  trigger,
  aoAdicionar,
  modo = "iniciar",
}: AdicionarFonteDialogProps) {
  const naFila = modo === "fila";
  // Controlado + desmontado quando fechado — ver ADR 012 (bug do Dialog/Popover).
  const [aberto, setAberto] = useState(false);
  const [link, setLink] = useState("");
  const [qualquerUmControla, setQualquerUmControla] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [adicionado, setAdicionado] = useState<string | null>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setEnviando(true);
    setErro(null);
    setAdicionado(null);
    const resposta = await aoAdicionar(link.trim(), qualquerUmControla);
    setEnviando(false);
    if (!resposta.ok) {
      setErro(resposta.erro);
      return;
    }
    setLink("");
    if (naFila) {
      // Fica aberto pra colar o próximo, com o cursor de volta no campo.
      setAdicionado(textoDaPosicao(resposta.naFila));
      campoRef.current?.focus();
    } else {
      setAberto(false);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) {
          setErro(null);
          setAdicionado(null);
        }
      }}
    >
      <DialogTrigger render={trigger as ReactElement} />
      {aberto && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="secondary">BETA</Badge>
              {naFila ? "Adicionar à fila" : "Adicionar vídeo do YouTube"}
            </DialogTitle>
            <DialogDescription>
              {naFila
                ? "O vídeo entra no fim da fila e toca quando os outros acabarem. Pode colar um link atrás do outro."
                : "Funciona como um controle remoto: todo mundo na sala assiste junto, sincronizado. Depois dá pra montar uma fila de vídeos."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={adicionar} className="flex flex-col gap-4">
            {!naFila && (
              <>
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
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="link-video" className="text-xs font-medium text-muted-foreground">
                Link
              </label>
              <Input
                id="link-video"
                ref={campoRef}
                placeholder="https://youtube.com/watch?v=... ou playlist"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setAdicionado(null);
                }}
                autoFocus
              />
              {erro && <p className="text-xs text-destructive">{erro}</p>}
              {/* Sempre no DOM (só o texto entra e sai): o leitor de tela só
                  anuncia mudança numa região que já existia. */}
              <p role="status" className="flex min-h-4 items-center gap-1 text-xs text-muted-foreground">
                {adicionado && (
                  <>
                    <Check className="size-3 text-primary" aria-hidden />
                    {adicionado}
                  </>
                )}
              </p>
            </div>

            <Button type="submit" disabled={!link.trim() || enviando} className="gap-1.5">
              {enviando && <Loader2 className="size-4 animate-spin" />}
              {/* O texto muda junto com o ícone: com "reduzir movimento" o ícone
                  não gira e só ele não diria que está enviando. */}
              {enviando ? "Adicionando…" : naFila ? "Adicionar à fila" : "Adicionar"}
            </Button>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
