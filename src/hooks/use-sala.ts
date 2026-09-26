"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { criarSocket, type SocketSala } from "@/lib/socket";
import { configuracaoIce } from "@/lib/webrtc-config";
import {
  aplicarLimiteBitrate,
  construirConstraintsVideo,
} from "@/lib/qualidade-transmissao";
import { useConfigTransmissaoStore } from "@/store/config-transmissao-store";
import type {
  ChatMessage,
  ComandoVideo,
  FonteVideo,
  Participant,
  ParticipantId,
} from "@/lib/socket-events";

type Status = "conectando" | "conectado" | "erro";

export interface ReacaoFlutuante {
  id: number;
  emoji: string;
  nome: string;
  /** Posição horizontal, em % da largura do vídeo. */
  x: number;
}

export interface EstatisticasVideo {
  largura: number;
  altura: number;
  fps: number;
  bytes: number;
  /** Timestamp do relatório WebRTC, em ms. */
  em: number;
}

/**
 * Toda a lógica de uma sala: entrar via Socket.IO, trocar sinalização WebRTC
 * e manter as conexões ponto a ponto de compartilhamento de tela.
 *
 * Modelo é "mesh só do lado de quem compartilha": cada pessoa que compartilha
 * a tela abre uma `RTCPeerConnection` direto com cada espectador (sem
 * servidor de vídeo no meio). Duas conexões separadas por par de participantes
 * quando os dois compartilham ao mesmo tempo — uma em cada sentido:
 * `conexoesSaida` (eu sou quem oferece, mando minha tela) e `conexoesEntrada`
 * (o outro oferece, eu só recebo). Ver docs/decisions.md (ADR 003).
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
  const [euId, setEuId] = useState<ParticipantId | null>(null);
  const [meuNome, setMeuNome] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [estouCompartilhando, setEstouCompartilhando] = useState(false);
  const [streamLocal, setStreamLocal] = useState<MediaStream | null>(null);
  const [streamsRemotos, setStreamsRemotos] = useState<
    Record<ParticipantId, MediaStream>
  >({});
  const [linkPublico, setLinkPublico] = useState<string | null>(null);
  const [fonteVideo, setFonteVideo] = useState<FonteVideo | null>(null);
  const [ultimoComandoVideo, setUltimoComandoVideo] = useState<
    (ComandoVideo & { de: ParticipantId }) | null
  >(null);

  const [reacoes, setReacoes] = useState<ReacaoFlutuante[]>([]);
  const contadorReacaoRef = useRef(0);

  const socketRef = useRef<SocketSala | null>(null);
  const conexoesSaida = useRef(new Map<ParticipantId, RTCPeerConnection>());
  const conexoesEntrada = useRef(new Map<ParticipantId, RTCPeerConnection>());
  const streamLocalRef = useRef<MediaStream | null>(null);
  const euIdRef = useRef<ParticipantId | null>(null);
  const participantesRef = useRef<Participant[]>([]);

  const removerStreamRemoto = useCallback((id: ParticipantId) => {
    setStreamsRemotos((atual) => {
      if (!(id in atual)) return atual;
      const copia = { ...atual };
      delete copia[id];
      return copia;
    });
  }, []);

  const fecharConexaoEntrada = useCallback(
    (id: ParticipantId) => {
      conexoesEntrada.current.get(id)?.close();
      conexoesEntrada.current.delete(id);
      removerStreamRemoto(id);
    },
    [removerStreamRemoto]
  );

  const fecharConexaoSaida = useCallback((id: ParticipantId) => {
    conexoesSaida.current.get(id)?.close();
    conexoesSaida.current.delete(id);
  }, []);

  const pararCompartilhamento = useCallback(() => {
    streamLocalRef.current?.getTracks().forEach((track) => track.stop());
    streamLocalRef.current = null;
    setStreamLocal(null);
    setEstouCompartilhando(false);
    setParticipantes((atual) =>
      atual.map((p) =>
        p.id === euIdRef.current ? { ...p, compartilhando: false } : p
      )
    );
    conexoesSaida.current.forEach((pc) => pc.close());
    conexoesSaida.current.clear();
    socketRef.current?.emit("compartilhar:parar");
  }, []);

  useEffect(() => {
    // `pronto=false` cobre dois casos: o sessionStorage ainda não hidratou
    // (ver `hidratado` em `usuario-store.ts`) e a pessoa ainda não decidiu
    // como vai se identificar nesta sala (nome próprio ou convidado).
    if (!pronto) return;

    const socket = criarSocket();
    socketRef.current = socket;

    function criarConexaoEntrada(deId: ParticipantId) {
      const pc = new RTCPeerConnection(configuracaoIce);
      conexoesEntrada.current.set(deId, pc);

      pc.onicecandidate = (evento) => {
        if (evento.candidate) {
          socket.emit("webrtc:sinal", {
            para: deId,
            tipo: "candidate",
            dados: evento.candidate,
          });
        }
      };

      pc.ontrack = (evento) => {
        setStreamsRemotos((atual) => ({ ...atual, [deId]: evento.streams[0] }));
      };

      return pc;
    }

    async function ofertarParaNovoParticipante(paraId: ParticipantId) {
      if (!streamLocalRef.current) return;
      const pc = new RTCPeerConnection(configuracaoIce);
      conexoesSaida.current.set(paraId, pc);
      streamLocalRef.current
        .getTracks()
        .forEach((track) => pc.addTrack(track, streamLocalRef.current!));
      await aplicarLimiteBitrate(pc, useConfigTransmissaoStore.getState().bitrateMbps);

      pc.onicecandidate = (evento) => {
        if (evento.candidate) {
          socket.emit("webrtc:sinal", {
            para: paraId,
            tipo: "candidate",
            dados: evento.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:sinal", { para: paraId, tipo: "offer", dados: offer });
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
      conexoesEntrada.current.forEach((pc) => pc.close());
      conexoesEntrada.current.clear();
      conexoesSaida.current.forEach((pc) => pc.close());
      conexoesSaida.current.clear();
      setStreamsRemotos({});

      socket.emit("sala:entrar", { codigo, nome: nomeEfetivo }, (resposta) => {
        if (!resposta.ok) {
          setErro(resposta.erro);
          setStatus("erro");
          return;
        }
        nomeEfetivo = resposta.nome;
        euIdRef.current = resposta.euId;
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
        setStatus("conectado");

        // Reconectei no meio de um compartilhamento: anuncia de novo e
        // reabre uma conexão de saída pra cada pessoa que está na sala.
        if (estavaCompartilhando) {
          socket.emit("compartilhar:iniciar");
          for (const participante of resposta.participantes) {
            ofertarParaNovoParticipante(participante.id).catch(() =>
              setErro("Não foi possível retomar o compartilhamento.")
            );
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
      ofertarParaNovoParticipante(participante.id).catch(() =>
        setErro("Não foi possível iniciar o compartilhamento com um participante.")
      );
    });

    socket.on("participante:saiu", (id) => {
      const quemSaiu = participantesRef.current.find((p) => p.id === id);
      if (quemSaiu) avisoDeSistema(`${quemSaiu.nome} saiu`);
      setParticipantes((atual) => {
        const proximo = atual.filter((p) => p.id !== id);
        participantesRef.current = proximo;
        return proximo;
      });
      fecharConexaoEntrada(id);
      fecharConexaoSaida(id);
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

    socket.on("webrtc:sinal", async ({ de, tipo, dados }) => {
      if (tipo === "offer") {
        const pc = conexoesEntrada.current.get(de) ?? criarConexaoEntrada(de);
        await pc.setRemoteDescription(new RTCSessionDescription(dados as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:sinal", { para: de, tipo: "answer", dados: answer });
        return;
      }
      if (tipo === "answer") {
        const pc = conexoesSaida.current.get(de);
        await pc?.setRemoteDescription(new RTCSessionDescription(dados as RTCSessionDescriptionInit));
        return;
      }
      // candidate: tenta a conexão de entrada primeiro (caso mais comum: assistindo alguém), senão a de saída.
      const pc = conexoesEntrada.current.get(de) ?? conexoesSaida.current.get(de);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(dados as RTCIceCandidateInit));
        } catch {
          // candidato atrasado/inválido, sem problema — ICE segue tentando outras rotas.
        }
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", aoVoltarAoApp);
      window.removeEventListener("offline", aoFicarOffline);
      window.removeEventListener("online", aoFicarOnline);
      socket.removeAllListeners();
      conexoesSaida.current.forEach((pc) => pc.close());
      conexoesEntrada.current.forEach((pc) => pc.close());
      // Não são refs de nó do DOM, são `Map`s de dados mutados direto — o
      // aviso do lint (pensado pra refs de elemento) não se aplica aqui.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      conexoesSaida.current.clear();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      conexoesEntrada.current.clear();
      streamLocalRef.current?.getTracks().forEach((track) => track.stop());
      socket.disconnect();
      socketRef.current = null;
    };
  }, [codigo, nome, pronto, fecharConexaoEntrada, fecharConexaoSaida]);

  /**
   * Foto do vídeo que estou recebendo de `id` (resolução, fps e total de
   * bytes recebidos — quem chama compara duas fotos pra achar o bitrate).
   * Deixa quem assiste diferenciar rede fraca de configuração de quem
   * transmite (ver ADR 019).
   */
  const enviarReacao = useCallback((emoji: string) => {
    socketRef.current?.emit("reacao:enviar", emoji);
  }, []);

  const lerEstatisticasEntrada = useCallback(async (id: ParticipantId) => {
    const pc = conexoesEntrada.current.get(id);
    if (!pc) return null;
    let foto: EstatisticasVideo | null = null;
    (await pc.getStats()).forEach((r) => {
      if (r.type === "inbound-rtp" && (r.kind ?? r.mediaType) === "video") {
        foto = {
          largura: r.frameWidth ?? 0,
          altura: r.frameHeight ?? 0,
          fps: r.framesPerSecond ?? 0,
          bytes: r.bytesReceived ?? 0,
          em: r.timestamp,
        };
      }
    });
    return foto;
  }, []);

  const enviarMensagem = useCallback((texto: string) => {
    if (!texto.trim()) return;
    socketRef.current?.emit("chat:enviar", { texto });
  }, []);

  const iniciarCompartilhamento = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;

    const { resolucao, fps, bitrateMbps } = useConfigTransmissaoStore.getState();

    const stream = await navigator.mediaDevices.getDisplayMedia({
      // Limita resolução e fps ao que foi escolhido em "Qualidade da
      // transmissão" (padrão 1080p/30fps) — sem isso o navegador captura na
      // resolução nativa do monitor sem limite de quadros, o que sobrecarrega
      // o encoder e derruba frames (era a causa da transmissão travando
      // mesmo entre duas abas na mesma máquina). Ver docs/decisions.md (ADR 011).
      video: construirConstraintsVideo(resolucao, fps),
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
    });

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
    for (const participante of participantesRef.current) {
      if (participante.id === euIdRef.current) continue;
      const pc = new RTCPeerConnection(configuracaoIce);
      conexoesSaida.current.set(participante.id, pc);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await aplicarLimiteBitrate(pc, bitrateMbps);
      pc.onicecandidate = (evento) => {
        if (evento.candidate) {
          socket.emit("webrtc:sinal", {
            para: participante.id,
            tipo: "candidate",
            dados: evento.candidate,
          });
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:sinal", { para: participante.id, tipo: "offer", dados: offer });
    }
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
    for (const pc of conexoesSaida.current.values()) {
      await aplicarLimiteBitrate(pc, bitrateMbps);
    }
  }, []);

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

  const removerFonteVideo = useCallback(() => {
    socketRef.current?.emit("fonte:remover");
  }, []);

  const enviarComandoVideo = useCallback((comando: ComandoVideo) => {
    socketRef.current?.emit("fonte:comando", comando);
  }, []);

  return {
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
    lerEstatisticasEntrada,
    reacoes,
    enviarReacao,
    iniciarCompartilhamento,
    pararCompartilhamento,
    atualizarQualidadeAoVivo,
  };
}
