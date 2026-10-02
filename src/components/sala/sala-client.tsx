"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  BellOff,
  Info,
  Lock,
  LogOut,
  MonitorUp,
  MonitorX,
  PanelLeftClose,
  PanelLeftOpen,
  PictureInPicture2,
  SquarePlay as YoutubeIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSala } from "@/hooks/use-sala";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useAvisos } from "@/hooks/use-avisos";
import { usePipAutomatico } from "@/hooks/use-pip-automatico";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  diagnosticarCaptura,
  explicarErroDeCaptura,
  MENSAGEM_SEM_CAPTURA,
} from "@/lib/captura-de-tela";
import { useUsuarioStore, useUsuarioHidratado } from "@/store/usuario-store";
import { useConfigTransmissaoStore } from "@/store/config-transmissao-store";
import {
  EVENTO_ABRIR_CHAT,
  EVENTO_MUDO,
  EVENTO_PIP,
  EVENTO_TELA_CHEIA,
  VideoTile,
} from "./video-tile";
import { YoutubePlayer } from "./youtube-player";
import { ListaParticipantes } from "./lista-participantes";
import { Chat } from "./chat";
import { CompartilharSalaDialog } from "./compartilhar-sala-dialog";
import { CopiarLinkButton } from "./copiar-link-button";
import { LinkConvite } from "./link-convite";
import { ReacoesFlutuantes } from "./reacoes-flutuantes";
import { ConfigTransmissaoPopover } from "./config-transmissao-popover";
import { StatusTransmissao } from "./status-transmissao";
import { AdicionarFonteDialog } from "./adicionar-fonte-dialog";
import { EscolherNomeSala } from "./escolher-nome-sala";

/**
 * A tela "em foco" que casa com o seletor: a que está em tela cheia, senão a
 * destacada, senão a primeira. É a mesma regra dos atalhos de teclado.
 */
function telaEmFoco(seletor: string) {
  const cheia = document.fullscreenElement;
  if (cheia?.hasAttribute("data-video-tile")) return cheia;
  return (
    document.querySelector(`[data-destacado] ${seletor}`) ?? document.querySelector(seletor)
  );
}

/** Liga/desliga a janelinha flutuante da transmissão que estou assistindo. */
function abrirPip() {
  telaEmFoco("[data-video-tile][data-remoto]")?.dispatchEvent(new Event(EVENTO_PIP));
}

interface SalaClientProps {
  codigo: string;
}

export function SalaClient({ codigo }: SalaClientProps) {
  const router = useRouter();
  const nome = useUsuarioStore((s) => s.nome);
  const hidratado = useUsuarioHidratado();
  const definirNome = useUsuarioStore((s) => s.definirNome);
  const bitrateMbps = useConfigTransmissaoStore((s) => s.bitrateMbps);

  // Quem clica em "Continuar como convidado" ainda não tem `nome` (é o
  // próprio servidor que decide "Convidado N" — ver docs/decisions.md, ADR
  // 013), mas já está pronto pra entrar. Sem isso, quem abrisse o link
  // direto de uma sala (sem nunca ter passado pela home) ficava preso: o
  // fluxo antigo redirecionava pra "/" e perdia o código da sala, ou nem
  // isso — a página simplesmente não renderizava nada.
  const [quisConvidado, setQuisConvidado] = useState(false);
  // Por que o último "Compartilhar tela" não funcionou (null = nada a dizer).
  const [erroCaptura, setErroCaptura] = useState<string | null>(null);
  const pronto = hidratado && (!!nome || quisConvidado);

  const {
    status,
    erro,
    motivoErro,
    euId,
    meuNome,
    participantes,
    mensagens,
    estouCompartilhando,
    streamLocal,
    temAudio,
    audioLigado,
    alternarAudio,
    avisoAudioTelaInteira,
    dispensarAvisoAudio,
    streamsRemotos,
    estadosConexao,
    linkPublico,
    trancada,
    definirTranca,
    fonteVideo,
    ultimoComandoVideo,
    adicionarFonteVideo,
    removerFonteVideo,
    enviarComandoVideo,
    enviarMensagem,
    lerEstatisticasEntrada,
    lerSaudeTransmissao,
    reacoes,
    enviarReacao,
    iniciarCompartilhamento,
    pararCompartilhamento,
    atualizarQualidadeAoVivo,
  } = useSala(codigo, nome, pronto);

  // Aba aberta no celular (no desktop os três painéis aparecem juntos) e
  // quantas mensagens o chat já mostrou — o que passa disso e não é minha
  // vira o contador de "não lidas" na aba. `vistas` só muda ao sair do chat,
  // então dá pra derivar tudo sem efeito.
  const [aba, setAba] = useState<"participantes" | "chat">("chat");
  const [vistas, setVistas] = useState(0);
  const lidas = aba === "chat" ? mensagens.length : vistas;
  const naoLidas = mensagens.slice(lidas).filter((m) => m.de !== euId && !m.sistema).length;

  function trocarAba(nova: "participantes" | "chat") {
    if (nova !== "chat") setVistas(mensagens.length);
    setAba(nova);
  }

  // Tela acesa enquanto tem algo passando (ver `useWakeLock`).
  useWakeLock(
    !!streamLocal || Object.keys(streamsRemotos).length > 0 || !!fonteVideo
  );

  // Trocou de aba (ex.: foi responder no WhatsApp Web): a transmissão que
  // está passando vira janelinha flutuante sozinha, onde o navegador deixa.
  usePipAutomatico(Object.keys(streamsRemotos).length > 0, abrirPip);

  // Só desktop: esconde a lista de participantes pra dar mais largura ao
  // vídeo (vídeo + chat). `destaqueId` é a tela ampliada quando há 2+ (as
  // outras viram uma faixa de miniaturas); `null` = todas do mesmo tamanho.
  //
  // Abaixo de 1024px o padrão já é sem a lista (com ela o chat e o vídeo
  // ficavam espremidos: 200 + 280px de colunas fixas num pane de ~800px). A
  // escolha da pessoa (botão/atalho C) vale por cima disso.
  const telaLarga = useMediaQuery("(min-width: 1024px)");
  const [cinemaEscolhido, setCinemaEscolhido] = useState<boolean | null>(null);
  const cinema = cinemaEscolhido ?? !telaLarga;
  const cinemaRef = useRef(cinema);
  useEffect(() => {
    cinemaRef.current = cinema;
  }, [cinema]);
  const alternarCinema = useCallback(() => setCinemaEscolhido(!cinemaRef.current), []);
  const [destaqueId, setDestaqueId] = useState<string | null>(null);

  // Contador no título da aba + bipe quando chega mensagem ou alguém começa
  // a transmitir com a aba escondida (ver `useAvisos`).
  const {
    somLigado,
    alternarSom,
    notificacaoDisponivel,
    notificacaoLigada,
    notificacaoBloqueada,
    alternarNotificacao,
  } = useAvisos({ mensagens, participantes, euId });

  // Atalhos: F tela cheia, M mudo, / chat, C modo cinema. Ignorados
  // enquanto se digita (campo de texto) ou com um diálogo aberto; o slider
  // de volume não conta como "digitando" — senão o atalho morreria depois
  // de mexer nele.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (
        alvo?.closest?.(
          "input:not([type=range]), textarea, select, [contenteditable=true], [role=dialog]"
        )
      ) {
        return;
      }
      switch (e.key.toLowerCase()) {
        case "f":
          telaEmFoco("[data-video-tile]")?.dispatchEvent(new Event(EVENTO_TELA_CHEIA));
          break;
        case "m":
          telaEmFoco("[data-video-tile][data-remoto]")?.dispatchEvent(new Event(EVENTO_MUDO));
          break;
        case "p":
          telaEmFoco("[data-video-tile]")?.dispatchEvent(new Event(EVENTO_PIP));
          break;
        case "c":
          alternarCinema();
          break;
        case "/": {
          e.preventDefault();
          const cheia = document.fullscreenElement;
          if (cheia?.hasAttribute("data-video-tile")) {
            cheia.dispatchEvent(new Event(EVENTO_ABRIR_CHAT));
            break;
          }
          const campos = document.querySelectorAll<HTMLInputElement>("[data-chat-input]");
          [...campos].find((c) => c.offsetParent !== null)?.focus();
          break;
        }
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [alternarCinema]);

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
        {motivoErro === "trancada" && (
          <p className="max-w-sm text-sm text-muted-foreground">
            Quando alguém de dentro destrancar, é só tentar de novo.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {motivoErro === "nome-em-uso" && (
            // O nome salvo nesta aba é o que está repetido: apaga e recarrega
            // pra cair na tela de escolher nome (recarregar sozinho só repetiria
            // o mesmo pedido).
            <Button
              onClick={() => {
                definirNome("");
                window.location.reload();
              }}
            >
              Escolher outro nome
            </Button>
          )}
          {/* Recarregar refaz a entrada do zero: serve pra queda de rede
              passageira e pra sala que acabou de ser destrancada. */}
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tentar de novo
          </Button>
          <Button variant={motivoErro === "nome-em-uso" ? "outline" : "default"} onClick={() => router.push("/")}>
            {motivoErro === "trancada" ? "Entrar em outra sala" : "Voltar"}
          </Button>
        </div>
      </div>
    );
  }

  const telas = Object.entries(streamsRemotos);
  // Só depois da hidratação (a sala não renderiza antes): `document` existe.
  const podeUsarPip = document.pictureInPictureEnabled;
  const souControladorDoVideo =
    !!fonteVideo && (fonteVideo.qualquerUmControla || fonteVideo.adicionadoPor === euId);
  const chatSobreposto = (
    <Chat mensagens={mensagens} euId={euId} onEnviar={enviarMensagem} onReagir={enviarReacao} />
  );
  type Destaque = { ativo: boolean; alternar: () => void } | undefined;
  const itens: { id: string; render: (d: Destaque) => ReactNode }[] = [];
  if (fonteVideo) {
    itens.push({
      id: "youtube",
      render: (d) => (
        <YoutubePlayer
          key={fonteVideo.youtubeId}
          youtubeId={fonteVideo.youtubeId}
          ehPlaylist={fonteVideo.ehPlaylist}
          souControlador={souControladorDoVideo}
          ultimoComando={ultimoComandoVideo}
          onComando={enviarComandoVideo}
          onRemover={souControladorDoVideo ? removerFonteVideo : undefined}
          destaque={d}
        />
      ),
    });
  }
  if (streamLocal) {
    itens.push({
      id: "local",
      render: (d) => (
        <VideoTile stream={streamLocal} nome="Você" mudo chat={chatSobreposto} destaque={d} reacoes={reacoes} />
      ),
    });
  }
  for (const [id, stream] of telas) {
    itens.push({
      id,
      render: (d) => (
        <VideoTile
          stream={stream}
          nome={participantes.find((p) => p.id === id)?.nome ?? "Participante"}
          participanteId={id}
          conexao={estadosConexao[id]}
          estatisticasDe={lerEstatisticasEntrada}
          chat={chatSobreposto}
          destaque={d}
          reacoes={reacoes}
        />
      ),
    });
  }
  const destaque =
    itens.length > 1 && itens.some((i) => i.id === destaqueId) ? destaqueId : null;
  const reconectando = status === "conectando" && euId !== null;
  const totalDeTelas = telas.length + (streamLocal ? 1 : 0) + (fonteVideo ? 1 : 0);
  const nadaAtivo = totalDeTelas === 0;
  const sozinho = participantes.length <= 1;
  // Só depois da hidratação (a sala não renderiza antes): `navigator` existe.
  const diagnosticoCaptura = diagnosticarCaptura();
  const podeCompartilhar = diagnosticoCaptura === "ok";
  async function compartilhar() {
    setErroCaptura(null);
    try {
      await iniciarCompartilhamento();
    } catch (erro) {
      // Cancelar o seletor não é erro (devolve null); o resto a pessoa precisa
      // ver — antes tudo isso sumia e o botão parecia quebrado.
      setErroCaptura(explicarErroDeCaptura(erro));
    }
  }

  const botaoAdicionarVideo = (
    <Button size="sm" variant="outline" className="gap-1.5">
      <YoutubeIcon className="size-3.5" />
      <span className="max-sm:sr-only">Adicionar vídeo</span>
    </Button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/40 px-3 py-2.5 sm:gap-x-3 sm:px-4">
        <span className="hidden font-heading text-sm tracking-wide text-dust-4 sm:inline">
          SINAL
        </span>
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          &gt; {codigo}
        </span>
        {trancada && (
          <span title="Sala trancada: ninguém novo entra" className="text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            <span className="sr-only">Sala trancada</span>
          </span>
        )}

        {/* Os controles ficam juntos à direita e, sem espaço (tablet, janela
            estreita), quebram de linha em vez de estourar a largura. */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:gap-x-3">

          {estouCompartilhando ? (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={pararCompartilhamento}
            >
              <MonitorX className="size-3.5" />
              <span className="max-sm:sr-only">Parar compartilhamento</span>
            </Button>
          ) : podeCompartilhar ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={compartilhar}>
                <MonitorUp className="size-3.5" />
                <span className="max-sm:sr-only">Compartilhar tela</span>
              </Button>
              <Tooltip>
                {/* Botão de verdade (não um `span`): assim o teclado alcança a
                    dica, e o foco é o que abre o tooltip. */}
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="Dica sobre áudio ao compartilhar"
                      className="hidden size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:flex"
                    />
                  }
                >
                  <Info className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  Pra levar o áudio de um vídeo sem pegar a voz do Discord, escolha
                  compartilhar uma aba do navegador ou uma janela (não a tela
                  toda) quando ele perguntar o quê compartilhar. Dá pra ligar e
                  desligar o áudio durante a transmissão.
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}

          {estouCompartilhando && temAudio && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={alternarAudio}
              aria-pressed={audioLigado}
              title={audioLigado ? "Tirar o áudio da transmissão" : "Voltar a enviar o áudio"}
            >
              {audioLigado ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              <span className="max-sm:sr-only">{audioLigado ? "Áudio ligado" : "Sem áudio"}</span>
            </Button>
          )}

          {estouCompartilhando && (
            <StatusTransmissao
              ler={lerSaudeTransmissao}
              nomeDe={(id) => participantes.find((p) => p.id === id)?.nome ?? "Participante"}
              bitrateMbps={bitrateMbps}
            />
          )}

          {!fonteVideo && (
            <AdicionarFonteDialog trigger={botaoAdicionarVideo} aoAdicionar={adicionarFonteVideo} />
          )}

          <ConfigTransmissaoPopover
            aoMudar={estouCompartilhando ? atualizarQualidadeAoVivo : undefined}
            espectadores={participantes.filter((p) => p.id !== euId).length}
          />

          {podeUsarPip && telas.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="hidden gap-1.5 md:inline-flex"
              onClick={abrirPip}
              title="Janela flutuante (P)"
            >
              <PictureInPicture2 className="size-3.5" />
              Janela flutuante
            </Button>
          )}

          <div className="hidden items-center gap-0.5 md:flex">
            <BotaoCabecalho
              rotulo={cinema ? "Mostrar participantes (C)" : "Modo cinema (C)"}
              onClick={alternarCinema}
            >
              {cinema ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </BotaoCabecalho>
            {/* Som, sino e copiar link só de 1024px pra cima: em tablet o
                cabeçalho já quebra em duas linhas (o link sai pelo botão
                "Compartilhar sala"). O modo cinema fica: é a única forma de
                trazer a lista de participantes de volta. */}
            <span className="hidden items-center gap-0.5 lg:flex">
              <BotaoCabecalho
                rotulo={somLigado ? "Silenciar avisos sonoros" : "Ligar avisos sonoros"}
                onClick={alternarSom}
              >
                {somLigado ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </BotaoCabecalho>
              {notificacaoDisponivel && (
                <BotaoCabecalho
                  rotulo={
                    notificacaoBloqueada
                      ? "Notificações bloqueadas — libere nas configurações do site no navegador"
                      : notificacaoLigada
                        ? "Desligar notificações do sistema"
                        : "Ligar notificações do sistema (mensagens e transmissões quando você estiver em outra janela)"
                  }
                  onClick={alternarNotificacao}
                >
                  {notificacaoLigada ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                </BotaoCabecalho>
              )}
              <CopiarLinkButton linkPublico={linkPublico} />
            </span>
          </div>

          <CompartilharSalaDialog
            codigo={codigo}
            linkPublico={linkPublico}
            trancada={trancada}
            aoAlternarTranca={() => definirTranca(!trancada)}
          />

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/")}
          >
            <LogOut className="size-3.5" />
            <span className="max-sm:sr-only">Sair</span>
          </Button>
        </div>
      </header>

      {estouCompartilhando && avisoAudioTelaInteira && audioLigado && (
        <div
          role="status"
          className="mx-3 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm md:mx-4"
        >
          <p className="min-w-0 flex-1 basis-72">
            Você está compartilhando a <strong className="font-medium">tela inteira com áudio</strong>:
            vai junto o som de tudo no computador, inclusive a voz do Discord. Quem
            estiver na chamada e assistindo aqui ouve cada voz duas vezes.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={alternarAudio}>
              Tirar o áudio
            </Button>
            <Button size="sm" variant="ghost" onClick={dispensarAvisoAudio}>
              Entendi
            </Button>
          </div>
        </div>
      )}

      {erroCaptura && (
        <div
          role="alert"
          className="mx-3 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm md:mx-4"
        >
          <p className="min-w-0 flex-1 basis-72">{erroCaptura}</p>
          <Button size="sm" variant="ghost" onClick={() => setErroCaptura(null)}>
            Entendi
          </Button>
        </div>
      )}

      {reconectando && (
        <div
          role="status"
          className="mx-auto mt-2 flex w-fit items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs text-primary"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Reconectando…
        </div>
      )}

      {/* Celular: coluna que não rola a página — vídeo no topo (fixo), abas e
          o painel da aba ativa ocupando o resto. Assim o vídeo nunca sai da
          tela enquanto se lê o chat e o teclado só empurra o painel. No
          desktop volta a ser a grade de três colunas. */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 p-3 md:grid md:gap-4 md:p-4 md:transition-[grid-template-columns] md:duration-300 md:ease-out",
          cinema
            ? "md:grid-cols-[0px_minmax(0,1fr)_280px]"
            : "md:grid-cols-[200px_minmax(0,1fr)_280px]"
        )}
      >
        <main
          className={cn(
            "relative order-1 shrink-0 transition-[margin] duration-300 ease-out md:order-2 md:min-h-0 md:shrink",
            cinema && "md:-ml-4",
            !nadaAtivo && "max-h-[50dvh] overflow-y-auto md:max-h-none md:overflow-visible"
          )}
        >
          {nadaAtivo ? (
            <div className="campo-poeira flex h-full flex-col items-center justify-center gap-6 rounded-3xl bg-white/[0.03] p-6 text-center md:p-10">
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {sozinho ? "Você está sozinho por aqui" : "Ninguém está transmitindo"}
                </h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {sozinho
                    ? "Copie o link e mande pros amigos entrarem na sala."
                    : "Compartilhe sua tela ou coloque um vídeo pra começar."}
                </p>
              </div>

              {sozinho && <LinkConvite linkPublico={linkPublico} />}

              <div className="flex flex-wrap items-center justify-center gap-2">
                {podeCompartilhar && (
                  <Button size="lg" onClick={compartilhar}>
                    <MonitorUp className="size-4" />
                    Compartilhar tela
                  </Button>
                )}
                <AdicionarFonteDialog
                  aoAdicionar={adicionarFonteVideo}
                  trigger={
                    <Button size="lg" variant="outline">
                      <YoutubeIcon className="size-4" />
                      Adicionar vídeo
                    </Button>
                  }
                />
              </div>
              {podeCompartilhar ? (
                <p className="hidden max-w-sm text-xs text-muted-foreground md:block">
                  Pra levar o áudio de um vídeo (YouTube, por exemplo) sem pegar
                  o áudio do Discord, escolha compartilhar{" "}
                  <span className="text-foreground">uma aba do navegador</span>,
                  não a tela toda, quando o navegador perguntar.
                </p>
              ) : (
                <p className="max-w-sm text-xs text-muted-foreground">
                  {MENSAGEM_SEM_CAPTURA[diagnosticoCaptura as "inseguro" | "sem-suporte"]}
                </p>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "grid h-full auto-rows-fr grid-cols-1 gap-3",
                // Com uma única tela ela ocupa a largura toda; com 2+ divide
                // em duas colunas. Sempre 2 colunas deixava uma coluna vazia
                // e a tela única pela metade.
                itens.length > 1 && !destaque && "sm:grid-cols-2",
                // Destaque (desktop): a escolhida ocupa a linha de cima, as
                // outras viram miniaturas embaixo. Continuam filhas diretas
                // do mesmo grid (só muda a classe): trocar de pai remontaria
                // o player do YouTube e perderia a sincronia.
                destaque &&
                  "md:grid-cols-4 md:grid-rows-[minmax(0,1fr)_7rem] md:auto-rows-[7rem]"
              )}
            >
              {itens.map((item) => {
                const eDestaque = destaque === item.id;
                const miniatura = !!destaque && !eDestaque;
                return (
                  <div
                    key={item.id}
                    data-destacado={eDestaque ? "" : undefined}
                    className={cn(
                      "group/envoltorio relative min-h-0 animate-in fade-in-0 zoom-in-95 duration-300 md:flex md:items-center md:justify-center md:[container-type:size]",
                      destaque &&
                        (eDestaque ? "md:col-span-4 md:row-start-1" : "md:row-start-2")
                    )}
                  >
                    {item.render(
                      itens.length > 1
                        ? {
                            ativo: eDestaque,
                            alternar: () => setDestaqueId(eDestaque ? null : item.id),
                          }
                        : undefined
                    )}
                    {miniatura ? (
                      <button
                        type="button"
                        onClick={() => setDestaqueId(item.id)}
                        aria-label="Destacar esta tela"
                        title="Destacar esta tela"
                        className="absolute inset-0 z-10 hidden cursor-pointer hover:bg-white/5 md:block"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <ReacoesFlutuantes reacoes={reacoes} />
        </main>

        <div role="group" aria-label="Painel" className="order-2 flex shrink-0 gap-1 rounded-full bg-white/[0.05] p-1 md:hidden">
          {(
            [
              ["chat", "Chat", naoLidas],
              ["participantes", `Participantes · ${participantes.length}`, 0],
            ] as const
          ).map(([id, rotulo, contagem]) => (
            <button
              key={id}
              type="button"
              aria-pressed={aba === id}
              onClick={() => trocarAba(id)}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-heading text-xs tracking-wide uppercase transition-colors",
                aba === id
                  ? "bg-white/10 text-foreground"
                  : "text-foreground/65 hover:text-foreground"
              )}
            >
              {rotulo}
              {contagem > 0 && (
                <span className="min-w-4 rounded-full bg-primary px-1.5 text-center text-xs leading-4 font-bold text-primary-foreground">
                  {contagem > 99 ? "99+" : contagem}
                </span>
              )}
            </button>
          ))}
        </div>

        <aside
          className={cn(
            "order-3 min-h-0 flex-1 overflow-y-auto rounded-3xl bg-white/[0.035] p-3 md:order-1 md:block md:flex-none md:overflow-visible md:p-4",
            aba !== "participantes" && "hidden",
            "transition-opacity duration-300 md:overflow-hidden",
            cinema && "md:pointer-events-none md:opacity-0"
          )}
        >
          <h2 className="mb-3 hidden px-1 font-heading text-xs tracking-wide text-foreground/75 uppercase md:block">
            Participantes · {participantes.length}
          </h2>
          <ListaParticipantes participantes={participantes} euId={euId} />
        </aside>

        <aside
          className={cn(
            "order-3 min-h-0 flex-1 flex-col rounded-3xl bg-white/[0.035] p-3 md:order-3 md:flex md:flex-none md:p-4",
            aba === "chat" ? "flex" : "hidden"
          )}
        >
          <h2 className="mb-3 hidden px-1 font-heading text-xs tracking-wide text-foreground/75 uppercase md:block">
            Chat
          </h2>
          <Chat mensagens={mensagens} euId={euId} onEnviar={enviarMensagem} onReagir={enviarReacao} />
        </aside>
      </div>
    </div>
  );
}

/** Botão de ícone do cabeçalho, com dica no hover. */
function BotaoCabecalho({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClick}
            aria-label={rotulo}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{rotulo}</TooltipContent>
    </Tooltip>
  );
}
