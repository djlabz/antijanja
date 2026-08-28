"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Info,
  LogOut,
  MonitorUp,
  MonitorX,
  SquarePlay as YoutubeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSala } from "@/hooks/use-sala";
import { useUsuarioStore, useUsuarioHidratado } from "@/store/usuario-store";
import { VideoTile } from "./video-tile";
import { YoutubePlayer } from "./youtube-player";
import { ListaParticipantes } from "./lista-participantes";
import { Chat } from "./chat";
import { CompartilharSalaDialog } from "./compartilhar-sala-dialog";
import { ConfigTransmissaoPopover } from "./config-transmissao-popover";
import { AdicionarFonteDialog } from "./adicionar-fonte-dialog";
import { EscolherNomeSala } from "./escolher-nome-sala";

interface SalaClientProps {
  codigo: string;
}

export function SalaClient({ codigo }: SalaClientProps) {
  const router = useRouter();
  const nome = useUsuarioStore((s) => s.nome);
  const hidratado = useUsuarioHidratado();
  const definirNome = useUsuarioStore((s) => s.definirNome);

  // Quem clica em "Continuar como convidado" ainda não tem `nome` (é o
  // próprio servidor que decide "Convidado N" — ver docs/decisions.md, ADR
  // 013), mas já está pronto pra entrar. Sem isso, quem abrisse o link
  // direto de uma sala (sem nunca ter passado pela home) ficava preso: o
  // fluxo antigo redirecionava pra "/" e perdia o código da sala, ou nem
  // isso — a página simplesmente não renderizava nada.
  const [quisConvidado, setQuisConvidado] = useState(false);
  const pronto = hidratado && (!!nome || quisConvidado);

  const {
    status,
    erro,
    euId,
    meuNome,
    participantes,
    mensagens,
    estouCompartilhando,
    streamLocal,
    streamsRemotos,
    linkPublico,
    fonteVideo,
    ultimoComandoVideo,
    adicionarFonteVideo,
    removerFonteVideo,
    enviarComandoVideo,
    enviarMensagem,
    iniciarCompartilhamento,
    pararCompartilhamento,
    atualizarQualidadeAoVivo,
  } = useSala(codigo, nome, pronto);

  // Guarda o nome final (digitado ou "Convidado N" atribuído pelo
  // servidor) pra sobreviver a um refresh desta mesma aba.
  useEffect(() => {
    if (meuNome) definirNome(meuNome);
  }, [meuNome, definirNome]);

  if (!hidratado) return null; // instantâneo — não é o "tela preta infinita" de antes.

  if (!pronto) {
    return (
      <EscolherNomeSala
        codigo={codigo}
        aoEscolherNome={definirNome}
        aoEscolherConvidado={() => setQuisConvidado(true)}
      />
    );
  }

  if (status === "erro") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-destructive">{erro}</p>
        <Button onClick={() => router.push("/")}>Voltar</Button>
      </div>
    );
  }

  const telas = Object.entries(streamsRemotos);
  const nadaAtivo = !streamLocal && telas.length === 0 && !fonteVideo;
  const souControladorDoVideo =
    !!fonteVideo && (fonteVideo.qualquerUmControla || fonteVideo.adicionadoPor === euId);

  async function compartilhar() {
    try {
      await iniciarCompartilhamento();
    } catch {
      // usuário cancelou o seletor de tela do navegador — sem erro pra mostrar.
    }
  }

  const botaoAdicionarVideo = (
    <Button size="sm" variant="outline" className="gap-1.5">
      <YoutubeIcon className="size-3.5" />
      <span className="hidden sm:inline">Adicionar vídeo</span>
    </Button>
  );

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

        {!fonteVideo && (
          <AdicionarFonteDialog trigger={botaoAdicionarVideo} aoAdicionar={adicionarFonteVideo} />
        )}

        <ConfigTransmissaoPopover
          aoMudar={estouCompartilhando ? atualizarQualidadeAoVivo : undefined}
        />

        <CompartilharSalaDialog codigo={codigo} linkPublico={linkPublico} />

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
          {nadaAtivo ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/20 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Ninguém está compartilhando a tela ainda.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={compartilhar} className="gap-1.5">
                  <MonitorUp className="size-4" />
                  Compartilhar tela
                </Button>
                <AdicionarFonteDialog
                  aoAdicionar={adicionarFonteVideo}
                  trigger={
                    <Button variant="outline" className="gap-1.5">
                      <YoutubeIcon className="size-4" />
                      Adicionar vídeo
                    </Button>
                  }
                />
              </div>
              <p className="max-w-sm text-xs text-muted-foreground">
                Pra levar o áudio de um vídeo (YouTube, por exemplo) sem
                pegar o áudio do Discord, escolha compartilhar{" "}
                <span className="text-foreground">uma aba do navegador</span>,
                não a tela toda, quando o navegador perguntar.
              </p>
            </div>
          ) : (
            <div className="grid h-full auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
              {fonteVideo && (
                <YoutubePlayer
                  key={fonteVideo.youtubeId}
                  youtubeId={fonteVideo.youtubeId}
                  ehPlaylist={fonteVideo.ehPlaylist}
                  souControlador={souControladorDoVideo}
                  ultimoComando={ultimoComandoVideo}
                  onComando={enviarComandoVideo}
                  onRemover={souControladorDoVideo ? removerFonteVideo : undefined}
                />
              )}
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
