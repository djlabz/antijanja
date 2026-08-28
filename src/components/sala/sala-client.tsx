"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Info, LogOut, MonitorUp, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSala } from "@/hooks/use-sala";
import { useUsuarioStore } from "@/store/usuario-store";
import { VideoTile } from "./video-tile";
import { ListaParticipantes } from "./lista-participantes";
import { Chat } from "./chat";
import { CompartilharSalaDialog } from "./compartilhar-sala-dialog";

interface SalaClientProps {
  codigo: string;
}

export function SalaClient({ codigo }: SalaClientProps) {
  const router = useRouter();
  const nome = useUsuarioStore((s) => s.nome);
  const hidratado = useUsuarioStore((s) => s.hidratado);

  useEffect(() => {
    // Só decide redirecionar depois que o nome salvo no sessionStorage já
    // foi lido — antes disso `nome` está temporariamente vazio mesmo pra
    // quem já entrou (ver `hidratado` em `usuario-store.ts`).
    if (hidratado && !nome) router.replace("/");
  }, [hidratado, nome, router]);

  const {
    status,
    erro,
    euId,
    participantes,
    mensagens,
    estouCompartilhando,
    streamLocal,
    streamsRemotos,
    enviarMensagem,
    iniciarCompartilhamento,
    pararCompartilhamento,
  } = useSala(codigo, nome);

  if (!nome) return null;

  if (status === "erro") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-destructive">{erro}</p>
        <Button onClick={() => router.push("/")}>Voltar</Button>
      </div>
    );
  }

  const telas = Object.entries(streamsRemotos);
  const ninguemCompartilhando = !streamLocal && telas.length === 0;

  async function compartilhar() {
    try {
      await iniciarCompartilhamento();
    } catch {
      // usuário cancelou o seletor de tela do navegador — sem erro pra mostrar.
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:gap-3 sm:px-4">
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">
          Tela Junto
        </span>
        <span className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
          {codigo}
        </span>

        <div className="flex-1" />

        {estouCompartilhando ? (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={pararCompartilhamento}
          >
            <MonitorX className="size-3.5" />
            <span className="hidden sm:inline">Parar compartilhamento</span>
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={compartilhar}>
              <MonitorUp className="size-3.5" />
              <span className="hidden sm:inline">Compartilhar tela</span>
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="hidden size-6 items-center justify-center text-muted-foreground sm:flex" />
                }
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Pra levar o áudio de um vídeo sem pegar o áudio do Discord,
                escolha compartilhar uma aba do navegador (não a tela toda)
                quando ele perguntar o quê compartilhar.
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <CompartilharSalaDialog codigo={codigo} />

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push("/")}
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[220px_1fr_300px]">
        <aside className="order-2 rounded-xl border border-border bg-card/40 p-3 md:order-1">
          <h2 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Participantes · {participantes.length}
          </h2>
          <ListaParticipantes participantes={participantes} euId={euId} />
        </aside>

        <main className="order-1 min-h-[40vh] md:order-2 md:min-h-0">
          {ninguemCompartilhando ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/20 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Ninguém está compartilhando a tela ainda.
              </p>
              <Button onClick={compartilhar} className="gap-1.5">
                <MonitorUp className="size-4" />
                Compartilhar tela
              </Button>
              <p className="max-w-sm text-xs text-muted-foreground">
                Pra levar o áudio de um vídeo (YouTube, por exemplo) sem
                pegar o áudio do Discord, escolha compartilhar{" "}
                <span className="text-foreground">uma aba do navegador</span>,
                não a tela toda, quando o navegador perguntar.
              </p>
            </div>
          ) : (
            <div className="grid h-full auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
              {streamLocal && <VideoTile stream={streamLocal} nome="Você" mudo />}
              {telas.map(([id, stream]) => (
                <VideoTile
                  key={id}
                  stream={stream}
                  nome={participantes.find((p) => p.id === id)?.nome ?? "Participante"}
                />
              ))}
            </div>
          )}
        </main>

        <aside className="order-3 flex min-h-[40vh] flex-col rounded-xl border border-border bg-card/40 p-3 md:min-h-0">
          <h2 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Chat
          </h2>
          <Chat mensagens={mensagens} euId={euId} onEnviar={enviarMensagem} />
        </aside>
      </div>
    </div>
  );
}
