"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Participant, ParticipantId } from "@/lib/socket-events";
import { ultimasPendentes } from "@/lib/historico-chat";

const CHAVE_SOM = "sinal:avisos-som";
const CHAVE_NOTIFICACAO = "sinal:avisos-notificacao";

let contextoAudio: AudioContext | null = null;

/** Bipe curto gerado na hora (sem arquivo de áudio pra carregar/hospedar). */
function tocarBipe() {
  try {
    contextoAudio ??= new AudioContext();
    const ctx = contextoAudio;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.0001, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // sem Web Audio — segue só com o contador no título.
  }
}

/**
 * Notificações do sistema só em computador com mouse: no celular o navegador
 * exige service worker pra `new Notification`, e lá a pessoa já recebe o aviso
 * do próprio aparelho.
 */
function notificacaoSuportada() {
  return (
    typeof Notification !== "undefined" &&
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover)").matches
  );
}

/** Em segundo plano = aba escondida OU janela sem foco (ex.: WhatsApp por cima). */
function emSegundoPlano() {
  return document.hidden || !document.hasFocus();
}

function resumir(texto: string, max = 120) {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

interface AvisosProps {
  mensagens: ChatMessage[];
  /** Quantas já chegaram desde sempre (a lista é cortada, o total não). */
  totalMensagens: number;
  participantes: Participant[];
  euId: ParticipantId | null;
}

/**
 * Avisa quem está em outra aba/janela (Discord, WhatsApp, jogo) do que
 * acontece na sala: mensagem nova ou alguém começando a transmitir. O aviso é
 * um contador no título da aba — "(3) Sinal" —, um bipe opcional e, se a
 * pessoa ligar, uma notificação do sistema que ao clicar traz a janela de
 * volta. Só dispara em segundo plano; ao voltar, zera. O título é escrito
 * direto no `document` (sem estado do React) pra não re-renderizar a sala
 * inteira a cada aviso.
 */
export function useAvisos({ mensagens, totalMensagens, participantes, euId }: AvisosProps) {
  const [somLigado, setSomLigado] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SOM) !== "0";
    } catch {
      return true;
    }
  });
  // Só vale ligado se a permissão do navegador também estiver concedida.
  const [notificacaoLigada, setNotificacaoLigada] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_NOTIFICACAO) === "1" && Notification.permission === "granted";
    } catch {
      return false;
    }
  });

  const somRef = useRef(somLigado);
  const notificacaoRef = useRef(notificacaoLigada);
  const pendentesRef = useRef(0);
  const mensagensVistasRef = useRef(totalMensagens);
  const transmissoresRef = useRef<Set<ParticipantId>>(new Set());

  useEffect(() => {
    somRef.current = somLigado;
  }, [somLigado]);
  useEffect(() => {
    notificacaoRef.current = notificacaoLigada;
  }, [notificacaoLigada]);

  // Navegadores só liberam áudio depois de um gesto da pessoa. Destravar no
  // primeiro toque/clique na página faz o primeiro aviso já sair com som, em
  // vez de mudo (antes só destravava ao ligar o sino).
  useEffect(() => {
    function destravar() {
      try {
        contextoAudio ??= new AudioContext();
        if (contextoAudio.state === "suspended") contextoAudio.resume().catch(() => {});
      } catch {
        // sem Web Audio — fica só o título.
      }
    }
    document.addEventListener("pointerdown", destravar, { once: true });
    return () => document.removeEventListener("pointerdown", destravar);
  }, []);

  // O título-base é lido na hora (tirando o "(n) " que a gente mesmo põe),
  // não guardado no mount: numa navegação do Next o `<title>` pode ainda
  // estar vazio nesse instante, e o aviso ficaria só "(3)".
  const atualizarTitulo = useCallback(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "") || "Sinal";
    document.title = pendentesRef.current > 0 ? `(${pendentesRef.current}) ${base}` : base;
  }, []);

  const notificar = useCallback((titulo: string, corpo: string) => {
    if (!notificacaoRef.current || Notification.permission !== "granted") return;
    try {
      // Mesmo `tag`: uma notificação nova substitui a anterior em vez de empilhar.
      const n = new Notification(titulo, { body: corpo, tag: "sinal", silent: true });
      n.onclick = () => {
        window.focus();
        n.close();
      };
      setTimeout(() => n.close(), 8000);
    } catch {
      // navegador que recusa `new Notification` — fica o título e o bipe.
    }
  }, []);

  const avisar = useCallback(
    (quantos: number, titulo: string, corpo: string) => {
      if (!emSegundoPlano()) return;
      pendentesRef.current += quantos;
      atualizarTitulo();
      if (somRef.current) tocarBipe();
      notificar(titulo, corpo);
    },
    [atualizarTitulo, notificar]
  );

  useEffect(() => {
    function aoVoltar() {
      if (emSegundoPlano()) return;
      pendentesRef.current = 0;
      atualizarTitulo();
    }
    // `visibilitychange` cobre trocar de aba; `focus` cobre voltar de outro
    // programa com o navegador já visível por baixo.
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      pendentesRef.current = 0;
      atualizarTitulo();
    };
  }, [atualizarTitulo]);

  useEffect(() => {
    const novas = ultimasPendentes(mensagens, totalMensagens, mensagensVistasRef.current);
    mensagensVistasRef.current = totalMensagens;
    const deOutros = novas.filter((m) => m.de !== euId && !m.sistema && !m.antiga);
    if (deOutros.length === 0) return;
    const ultima = deOutros[deOutros.length - 1];
    avisar(
      deOutros.length,
      deOutros.length > 1 ? `${deOutros.length} mensagens novas` : ultima.nome,
      deOutros.length > 1 ? `${ultima.nome}: ${resumir(ultima.texto)}` : resumir(ultima.texto)
    );
  }, [mensagens, totalMensagens, euId, avisar]);

  useEffect(() => {
    const transmitindo = participantes.filter((p) => p.compartilhando && p.id !== euId);
    const agora = new Set(transmitindo.map((p) => p.id));
    const iniciaram = transmitindo.filter((p) => !transmissoresRef.current.has(p.id));
    transmissoresRef.current = agora;
    if (iniciaram.length > 0) {
      avisar(
        iniciaram.length,
        iniciaram.length > 1
          ? `${iniciaram.length} pessoas começaram a transmitir`
          : `${iniciaram[0].nome} começou a transmitir`,
        "Clique pra assistir."
      );
    }
  }, [participantes, euId, avisar]);

  const alternarSom = useCallback(() => {
    const novo = !somRef.current;
    setSomLigado(novo);
    try {
      localStorage.setItem(CHAVE_SOM, novo ? "1" : "0");
    } catch {
      // sem localStorage — vale só até recarregar.
    }
    // Toca já ao ligar: confirma que funciona e destrava o áudio do navegador.
    if (novo) tocarBipe();
  }, []);

  const alternarNotificacao = useCallback(async () => {
    if (!notificacaoSuportada()) return;
    let ligar = !notificacaoRef.current;
    if (ligar && Notification.permission !== "granted") {
      // Só pode pedir permissão a partir de um clique — é o que este botão é.
      ligar = (await Notification.requestPermission()) === "granted";
    }
    // Ligar já vale agora (o ref é o que `notificar` lê), sem esperar o render.
    notificacaoRef.current = ligar;
    setNotificacaoLigada(ligar);
    try {
      localStorage.setItem(CHAVE_NOTIFICACAO, ligar ? "1" : "0");
    } catch {
      // sem localStorage — vale só até recarregar.
    }
    if (ligar) notificar("Avisos ligados", "Você será avisado quando alguém falar ou transmitir.");
  }, [notificar]);

  return {
    somLigado,
    alternarSom,
    notificacaoDisponivel: notificacaoSuportada(),
    notificacaoLigada,
    // O navegador guardou "não" pro site: só a pessoa desfaz, nas configurações dele.
    notificacaoBloqueada: typeof Notification !== "undefined" && Notification.permission === "denied",
    alternarNotificacao,
  };
}
