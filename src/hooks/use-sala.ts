"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { criarSocket, type SocketSala } from "@/lib/socket";
import {
  criarConexoes,
  type Conexoes,
  type EstadoConexao,
  type EstatisticasVideo,
  type SaudeSaida,
} from "@/lib/conexoes-webrtc";
import { construirConstraintsVideo } from "@/lib/qualidade-transmissao";
import { useConfigTransmissaoStore } from "@/store/config-transmissao-store";
import type {
  ChatMessage,
  ComandoVideo,
  FonteVideo,
  IceServerConfig,
  MotivoRecusa,
  Participant,
  ParticipantId,
} from "@/lib/socket-events";

export type { EstadoConexao, EstatisticasVideo, SaudeSaida };

type Status = "conectando" | "conectado" | "erro";

export interface ReacaoFlutuante {
  id: number;
  emoji: string;
  nome: string;
  /** Posição horizontal, em % da largura do vídeo. */
  x: number;
}

/**
 * Identifica ESTA aba (não a conexão): igual em toda reconexão, diferente
 * numa aba nova. É o que permite ao servidor reconhecer "sou eu voltando" em
 * vez de recusar meu próprio nome (ADR 025). `crypto.randomUUID` só existe em
 * contexto seguro (https/localhost) — num IP da rede local em http cai no
 * sorteio simples, que serve igual (não é segredo, só um identificador).
 */
function gerarSessao() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/**
 * Toda a lógica de uma sala: entrar via Socket.IO, trocar sinalização WebRTC
 * e manter as conexões ponto a ponto de compartilhamento de tela.
 *
 * As conexões em si (abrir, fechar, reiniciar quando caem) moram em
 * `@/lib/conexoes-webrtc`; aqui só se liga isso ao socket e ao estado da tela.
 * O modelo é "mesh só do lado de quem compartilha" — ver docs/decisions.md
 * (ADR 003).
 *
 * O socket é criado aqui dentro (não é um singleton importado) e fechado no
 * cleanup deste mesmo efeito — ver docs/decisions.md (ADR 006).
 *
 * `nome` pode chegar como string vazia — significa "atribua um nome de
 * convidado" (o servidor decide, ver ADR 014). `pronto` controla só SE a
 * conexão deve acontecer: falso enquanto a pessoa ainda está decidindo
 * como vai se identificar (digitar nome ou entrar como convidado) — ver
 * `EscolherNomeSala`.
 */
export function useSala(codigo: string, nome: string, pronto: boolean) {
  const [status, setStatus] = useState<Status>("conectando");
  const [erro, setErro] = useState<string | null>(null);
  // Quando o servidor recusou a entrada por um motivo que a tela trata à parte
  // (sala trancada, nome repetido); null = erro comum.
  const [motivoErro, setMotivoErro] = useState<MotivoRecusa | null>(null);
  const [euId, setEuId] = useState<ParticipantId | null>(null);
  const [meuNome, setMeuNome] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [estouCompartilhando, setEstouCompartilhando] = useState(false);
  const [streamLocal, setStreamLocal] = useState<MediaStream | null>(null);
  // Áudio da minha transmissão: existe? está ligado? E o aviso de "tela
  // inteira com áudio do sistema" (duplica as vozes de quem está no Discord).
  const [temAudio, setTemAudio] = useState(false);
  const [audioLigado, setAudioLigado] = useState(true);
  const [avisoAudioTelaInteira, setAvisoAudioTelaInteira] = useState(false);
  const [streamsRemotos, setStreamsRemotos] = useState<
    Record<ParticipantId, MediaStream>
  >({});
  const [estadosConexao, setEstadosConexao] = useState<
    Record<ParticipantId, EstadoConexao>
  >({});
  const [linkPublico, setLinkPublico] = useState<string | null>(null);
  const [fonteVideo, setFonteVideo] = useState<FonteVideo | null>(null);
  const [trancada, setTrancada] = useState(false);
  const [ultimoComandoVideo, setUltimoComandoVideo] = useState<
    (ComandoVideo & { de: ParticipantId }) | null
  >(null);

  // Vale pela vida desta aba: o efeito abaixo reabre o socket quando o nome
  // muda (convidado recebe o nome do servidor) e isso também é "a mesma pessoa".
  const [sessao] = useState(gerarSessao);

  const [reacoes, setReacoes] = useState<ReacaoFlutuante[]>([]);
  const contadorReacaoRef = useRef(0);

  const socketRef = useRef<SocketSala | null>(null);
  const conexoesRef = useRef<Conexoes | null>(null);
  const streamLocalRef = useRef<MediaStream | null>(null);
  const euIdRef = useRef<ParticipantId | null>(null);
  const participantesRef = useRef<Participant[]>([]);
  const iceServersRef = useRef<IceServerConfig[]>([]);

  const removerStreamRemoto = useCallback((id: ParticipantId) => {
    setStreamsRemotos((atual) => {
      if (!(id in atual)) return atual;
      const copia = { ...atual };
      delete copia[id];
      return copia;
    });
  }, []);

  const pararCompartilhamento = useCallback(() => {
    streamLocalRef.current?.getTracks().forEach((track) => track.stop());
    streamLocalRef.current = null;
    setStreamLocal(null);
    setEstouCompartilhando(false);
    setTemAudio(false);
    setAvisoAudioTelaInteira(false);
    setParticipantes((atual) =>
      atual.map((p) =>
        p.id === euIdRef.current ? { ...p, compartilhando: false } : p
      )
    );
    conexoesRef.current?.fecharSaidas();
    socketRef.current?.emit("compartilhar:parar");
  }, []);

  useEffect(() => {
    // `pronto=false` cobre dois casos: o sessionStorage ainda não hidratou
    // (ver `hidratado` em `usuario-store.ts`) e a pessoa ainda não decidiu
    // como vai se identificar nesta sala (nome próprio ou convidado).
    if (!pronto) return;

    const socket = criarSocket();
    socketRef.current = socket;

    const conexoes = criarConexoes({
      enviarSinal: (para, tipo, dados, origem) =>
        socket.emit("webrtc:sinal", { para, tipo, dados, origem }),
      obterStreamLocal: () => streamLocalRef.current,
      obterBitrateMbps: () => useConfigTransmissaoStore.getState().bitrateMbps,
      obterIceServers: () => iceServersRef.current,
      aoReceberStream: (de, stream) =>
        setStreamsRemotos((atual) => ({ ...atual, [de]: stream })),
      aoMudarEstadoEntrada: (de, estado) =>
        setEstadosConexao((atual) => {
          if (estado === null) {
            if (!(de in atual)) return atual;
            const copia = { ...atual };
            delete copia[de];
            return copia;
          }
          return atual[de] === estado ? atual : { ...atual, [de]: estado };
        }),
    });
    conexoesRef.current = conexoes;

    function ofertar(paraId: ParticipantId, mensagemErro: string) {
      conexoes.ofertar(paraId).catch(() => setErro(mensagemErro));
    }

    function fecharConexaoEntrada(id: ParticipantId) {
      conexoes.fecharEntrada(id);
      removerStreamRemoto(id);
    }

    // Nome que vale numa reentrada: o que o servidor já nos deu (convidado
    // vem com "" e o servidor sorteia "Convidado N") — senão o convidado
    // trocaria de nome a cada reconexão.
    let nomeEfetivo = nome;

    function entrar() {
      // Cada `connect` (o primeiro e todo reconectar) é um socket novo do
      // ponto de vista do servidor: ele já nos removeu da sala e tratou como
      // saída, e as conexões WebRTC antigas morreram junto. Sem reentrar, o
      // celular que bloqueia a tela/troca de rede volta "conectado" mas fora
      // da sala, com o vídeo congelado (ver ADR 020).
      conexoes.fecharTudo();
      setStreamsRemotos({});

      socket.emit("sala:entrar", { codigo, nome: nomeEfetivo, sessao }, (resposta) => {
        if (!resposta.ok) {
          setErro(resposta.erro);
          setMotivoErro(resposta.motivo ?? null);
          setStatus("erro");
          return;
        }
        nomeEfetivo = resposta.nome;
        euIdRef.current = resposta.euId;
        iceServersRef.current = resposta.iceServers ?? [];
        setEuId(resposta.euId);
        setMeuNome(resposta.nome); // pode diferir de `nome` (convidado: veio vazio, o servidor decidiu).
        const estavaCompartilhando = streamLocalRef.current !== null;
        const todos = [
          ...resposta.participantes,
          {
            id: resposta.euId,
            nome: resposta.nome,
            compartilhando: estavaCompartilhando,
          },
        ];
        participantesRef.current = todos;
        setParticipantes(todos);
        setFonteVideo(resposta.fonteVideo);
        setTrancada(resposta.trancada ?? false);
        setStatus("conectado");

        // Reconectei no meio de um compartilhamento: anuncia de novo e
        // reabre uma conexão de saída pra cada pessoa que está na sala.
        if (estavaCompartilhando) {
          socket.emit("compartilhar:iniciar");
          for (const participante of resposta.participantes) {
            ofertar(participante.id, "Não foi possível retomar o compartilhamento.");
          }
        }
      });
    }

    // `connect` dispara na primeira conexão e em toda reconexão automática.
    socket.on("connect", entrar);

    // Se o servidor derrubou a gente de propósito o Socket.IO não reconecta
    // sozinho; e ao voltar pro app (celular) força a tentativa na hora em vez
    // de esperar o próximo backoff.
    socket.on("disconnect", (motivo) => {
      setStatus("conectando");
      if (motivo === "io server disconnect") socket.connect();
    });
    function aoVoltarAoApp() {
      if (document.visibilityState === "visible" && !socket.connected) {
        socket.connect();
      }
    }
    document.addEventListener("visibilitychange", aoVoltarAoApp);

    // O Socket.IO só percebe a queda de rede no próximo ping (dezenas de
    // segundos); o navegador avisa na hora. Serve pra mostrar "Reconectando"
    // sem demora e tentar voltar assim que a rede volta.
    function aoFicarOffline() {
      setStatus("conectando");
    }
    function aoFicarOnline() {
      if (socket.connected) setStatus("conectado");
      else socket.connect();
    }
    window.addEventListener("offline", aoFicarOffline);
    window.addEventListener("online", aoFicarOnline);

    function avisoDeSistema(texto: string) {
      setMensagens((atual) => [
        ...atual,
        { de: "", nome: "", texto, em: Date.now(), sistema: true },
      ]);
    }

    socket.on("participante:entrou", (participante) => {
      avisoDeSistema(`${participante.nome} entrou`);
      setParticipantes((atual) => {
        const proximo = [...atual, participante];
        participantesRef.current = proximo;
        return proximo;
      });
      ofertar(participante.id, "Não foi possível iniciar o compartilhamento com um participante.");
    });

    socket.on("participante:saiu", (id) => {
      const quemSaiu = participantesRef.current.find((p) => p.id === id);
      if (quemSaiu) avisoDeSistema(`${quemSaiu.nome} saiu`);
      setParticipantes((atual) => {
        const proximo = atual.filter((p) => p.id !== id);
        participantesRef.current = proximo;
        return proximo;
      });
      conexoes.esquecer(id);
      removerStreamRemoto(id);
    });

    socket.on("chat:mensagem", (mensagem) => {
      setMensagens((atual) => [...atual, mensagem]);
    });

    socket.on("reacao:recebida", ({ nome: quem, emoji }) => {
      const id = ++contadorReacaoRef.current;
      const x = 10 + Math.random() * 80;
      // Limite de 30 na tela pra uma enxurrada não pesar; cada uma some sozinha.
      setReacoes((atual) => [...atual.slice(-29), { id, emoji, nome: quem, x }]);
      setTimeout(() => setReacoes((atual) => atual.filter((r) => r.id !== id)), 2600);
    });

    socket.on("link:publico", (url) => {
      setLinkPublico(url);
    });

    socket.on("sala:trancada", (valor) => {
      setTrancada(valor);
    });

    socket.on("fonte:atualizada", (fonte) => {
      setFonteVideo(fonte);
    });

    socket.on("fonte:comando", (comando) => {
      setUltimoComandoVideo(comando);
    });

    socket.on("compartilhar:iniciou", (id) => {
      setParticipantes((atual) =>
        atual.map((p) => (p.id === id ? { ...p, compartilhando: true } : p))
      );
    });

    socket.on("compartilhar:parou", (id) => {
      setParticipantes((atual) =>
        atual.map((p) => (p.id === id ? { ...p, compartilhando: false } : p))
      );
      fecharConexaoEntrada(id);
    });

    socket.on("webrtc:sinal", ({ de, tipo, dados, origem }) => {
      conexoes.tratarSinal(de, tipo, dados, origem);
    });

    return () => {
      document.removeEventListener("visibilitychange", aoVoltarAoApp);
      window.removeEventListener("offline", aoFicarOffline);
      window.removeEventListener("online", aoFicarOnline);
      socket.removeAllListeners();
      conexoes.encerrar();
      conexoesRef.current = null;
      streamLocalRef.current?.getTracks().forEach((track) => track.stop());
      socket.disconnect();
      socketRef.current = null;
    };
  }, [codigo, nome, pronto, sessao, removerStreamRemoto]);

  const enviarReacao = useCallback((emoji: string) => {
    socketRef.current?.emit("reacao:enviar", emoji);
  }, []);

  /** Foto do vídeo que recebo de `id` (ver `estatisticas` em `conexoes-webrtc`). */
  const lerEstatisticasEntrada = useCallback(
    async (id: ParticipantId) => (await conexoesRef.current?.estatisticas(id)) ?? null,
    []
  );

  /** Como está cada conexão de saída (quem transmite acompanha quem recebe). */
  const lerSaudeTransmissao = useCallback(
    async () => (await conexoesRef.current?.saude()) ?? [],
    []
  );

  const enviarMensagem = useCallback((texto: string) => {
    if (!texto.trim()) return;
    socketRef.current?.emit("chat:enviar", { texto });
  }, []);

  const iniciarCompartilhamento = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;

    const { resolucao, fps } = useConfigTransmissaoStore.getState();

    // `selfBrowserSurface` e `windowAudio` são do Chrome e ainda não estão no
    // tipo do TypeScript.
    const opcoes: DisplayMediaStreamOptions & {
      selfBrowserSurface?: "include" | "exclude";
      windowAudio?: "exclude" | "system" | "window";
    } = {
      // Limita resolução e fps ao que foi escolhido em "Qualidade da
      // transmissão" (padrão 1080p/30fps) — sem isso o navegador captura na
      // resolução nativa do monitor sem limite de quadros, o que sobrecarrega
      // o encoder e derruba frames (era a causa da transmissão travando
      // mesmo entre duas abas na mesma máquina). Ver docs/decisions.md (ADR 011).
      video: construirConstraintsVideo(resolucao, fps),
      // Tira a aba do próprio Sinal do seletor do Chrome: compartilhá-la gera
      // um espelho infinito (a tela mostrando a tela mostrando a tela...).
      selfBrowserSurface: "exclude",
      // Ao escolher uma JANELA, oferece o áudio só dela (Chrome 141+) em vez do
      // áudio do sistema inteiro — que levaria junto a voz do Discord (ADR 030).
      windowAudio: "window",
      // Sem processamento de voz: isso é áudio de vídeo/jogo, não microfone.
      // Cancelamento de eco e supressão de ruído tratam música/efeitos como
      // "ruído" e cortam pedaços — só atrapalham aqui. Ver docs/decisions.md
      // (ADR 008) sobre por que isolar o áudio do Discord é escolha de QUAL
      // superfície compartilhar (aba do navegador), não algo que dá pra
      // forçar por código.
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };
    const stream = await navigator.mediaDevices.getDisplayMedia(opcoes);

    const trilhaVideo = stream.getVideoTracks()[0];
    if (trilhaVideo) {
      // "detail", não "motion": pra compartilhamento de tela, texto/UI
      // legível importa mais que fluidez perfeita — e `contentHint` também
      // é o sinal que o navegador usa pra escolher o `degradationPreference`
      // padrão (motion → prioriza fps, derrubando resolução sob aperto de
      // banda; detail → o contrário). É reforçado explicitamente em
      // `aplicarLimiteBitrate` (ver ADR 019); aqui é só pra não mandar dois
      // sinais contraditórios pro encoder.
      trilhaVideo.contentHint = "detail";
    }

    // Tela INTEIRA com áudio = o do sistema todo, Discord incluído. Quem está
    // na chamada e também assiste o Sinal ouviria cada voz duas vezes.
    const trilhasAudio = stream.getAudioTracks();
    setTemAudio(trilhasAudio.length > 0);
    setAudioLigado(true);
    setAvisoAudioTelaInteira(
      trilhasAudio.length > 0 && trilhaVideo?.getSettings().displaySurface === "monitor"
    );

    streamLocalRef.current = stream;
    setStreamLocal(stream);
    setEstouCompartilhando(true);
    setParticipantes((atual) =>
      atual.map((p) =>
        p.id === euIdRef.current ? { ...p, compartilhando: true } : p
      )
    );

    // Se a pessoa parar pelo controle nativo do navegador ("Parar
    // compartilhamento"), a track termina sozinha — detecta isso aqui.
    trilhaVideo?.addEventListener("ended", pararCompartilhamento);

    socket.emit("compartilhar:iniciar");
    // Em paralelo: um espectador lento não atrasa a oferta pros outros.
    await Promise.allSettled(
      participantesRef.current
        .filter((p) => p.id !== euIdRef.current)
        .map((p) => conexoesRef.current?.ofertar(p.id))
    );
  }, [pararCompartilhamento]);

  /**
   * Reaplica a qualidade escolhida sem precisar parar e começar de novo o
   * compartilhamento — chamada sempre que a pessoa muda algo no painel de
   * "Qualidade da transmissão" enquanto já está compartilhando.
   */
  const atualizarQualidadeAoVivo = useCallback(async () => {
    const { resolucao, fps, bitrateMbps } = useConfigTransmissaoStore.getState();
    const trilhaVideo = streamLocalRef.current?.getVideoTracks()[0];
    if (trilhaVideo) {
      try {
        await trilhaVideo.applyConstraints(construirConstraintsVideo(resolucao, fps));
      } catch {
        // Nem toda fonte de captura aceita mudar resolução/fps em tempo
        // real — sem problema, vale a partir do próximo compartilhamento.
      }
    }
    await conexoesRef.current?.aplicarBitrate(bitrateMbps);
  }, []);

  /**
   * Liga/desliga o áudio da transmissão na hora, sem parar nem renegociar:
   * uma trilha com `enabled = false` segue enviando, só que silêncio.
   */
  const alternarAudio = useCallback(() => {
    const trilhas = streamLocalRef.current?.getAudioTracks() ?? [];
    if (trilhas.length === 0) return;
    const ligar = !trilhas.every((t) => t.enabled);
    trilhas.forEach((t) => {
      t.enabled = ligar;
    });
    setAudioLigado(ligar);
  }, []);

  const dispensarAvisoAudio = useCallback(() => setAvisoAudioTelaInteira(false), []);

  const adicionarFonteVideo = useCallback(
    (link: string, qualquerUmControla: boolean) =>
      new Promise<{ ok: true } | { ok: false; erro: string }>((resolve) => {
        if (!socketRef.current) {
          resolve({ ok: false, erro: "Sem conexão com o servidor." });
          return;
        }
        socketRef.current.emit("fonte:adicionar", { link, qualquerUmControla }, resolve);
      }),
    []
  );

  const definirTranca = useCallback((trancar: boolean) => {
    socketRef.current?.emit("sala:trancar", trancar);
  }, []);

  const removerFonteVideo = useCallback(() => {
    socketRef.current?.emit("fonte:remover");
  }, []);

  const enviarComandoVideo = useCallback((comando: ComandoVideo) => {
    socketRef.current?.emit("fonte:comando", comando);
  }, []);

  return {
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
  };
}
