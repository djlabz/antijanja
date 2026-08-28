"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { criarSocket, type SocketSala } from "@/lib/socket";
import { configuracaoIce } from "@/lib/webrtc-config";
import type {
  ChatMessage,
  Participant,
  ParticipantId,
} from "@/lib/socket-events";

type Status = "conectando" | "conectado" | "erro";

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
 */
export function useSala(codigo: string, nome: string) {
  const [status, setStatus] = useState<Status>("conectando");
  const [erro, setErro] = useState<string | null>(null);
  const [euId, setEuId] = useState<ParticipantId | null>(null);
  const [participantes, setParticipantes] = useState<Participant[]>([]);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([]);
  const [estouCompartilhando, setEstouCompartilhando] = useState(false);
  const [streamLocal, setStreamLocal] = useState<MediaStream | null>(null);
  const [streamsRemotos, setStreamsRemotos] = useState<
    Record<ParticipantId, MediaStream>
  >({});

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
    // `nome` chega vazio por um instante antes do sessionStorage hidratar
    // (ver `hidratado` em `usuario-store.ts`) — não vale a pena abrir uma
    // conexão fadada a um erro de validação do servidor por causa disso.
    if (!nome) return;

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

    socket.emit("sala:entrar", { codigo, nome }, (resposta) => {
      if (!resposta.ok) {
        setErro(resposta.erro);
        setStatus("erro");
        return;
      }
      euIdRef.current = resposta.euId;
      setEuId(resposta.euId);
      const todos = [
        ...resposta.participantes,
        { id: resposta.euId, nome, compartilhando: false },
      ];
      participantesRef.current = todos;
      setParticipantes(todos);
      setStatus("conectado");
    });

    socket.on("participante:entrou", (participante) => {
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
  }, [codigo, nome, fecharConexaoEntrada, fecharConexaoSaida]);

  const enviarMensagem = useCallback((texto: string) => {
    if (!texto.trim()) return;
    socketRef.current?.emit("chat:enviar", { texto });
  }, []);

  const iniciarCompartilhamento = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
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
    stream.getVideoTracks()[0]?.addEventListener("ended", pararCompartilhamento);

    socket.emit("compartilhar:iniciar");
    for (const participante of participantesRef.current) {
      if (participante.id === euIdRef.current) continue;
      const pc = new RTCPeerConnection(configuracaoIce);
      conexoesSaida.current.set(participante.id, pc);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
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

  return {
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
  };
}
