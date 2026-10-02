/**
 * Quando o envio de internet de quem transmite não dá conta, o encoder já
 * perde fps sozinho (ADR 019 trava a resolução). Aqui fica a regra de "o que
 * sugerir baixar", sem React, testável no Node — o painel só mostra o aviso e
 * aplica com um clique.
 */
import { FPS_OPCOES, RESOLUCOES, type ResolucaoId } from "./qualidade-transmissao";
import type { EstadoConexao, LimiteEnvio } from "./conexoes-webrtc";

export interface ConfigQualidade {
  resolucao: ResolucaoId;
  fps: number;
  bitrateMbps: number | null;
}

export interface Sugestao {
  nova: ConfigQualidade;
  /** Texto curto do que ficaria ("720p, 30 fps, até 2 Mbps"). */
  resumo: string;
}

const TETO_BITRATE_REDUZIDO = 2;

function resumir({ resolucao, fps, bitrateMbps }: ConfigQualidade): string {
  const mbps = bitrateMbps === null ? "sem limite de Mbps" : `até ${bitrateMbps} Mbps`;
  return `${RESOLUCOES[resolucao].rotulo}, ${fps} fps, ${mbps}`;
}

const sugestao = (nova: ConfigQualidade): Sugestao => ({ nova, resumo: resumir(nova) });

/**
 * O próximo degrau pra baixo, do que mais alivia o upload ao que menos:
 * resolução (e teto de 2 Mbps), 60→30 fps, bitrate, fps. `null` = já está no
 * mínimo que o app oferece.
 */
export function sugerirReducao(atual: ConfigQualidade): Sugestao | null {
  const { resolucao, fps, bitrateMbps } = atual;
  const comTeto = bitrateMbps === null || bitrateMbps > TETO_BITRATE_REDUZIDO ? TETO_BITRATE_REDUZIDO : bitrateMbps;

  if (resolucao !== "720p") {
    return sugestao({ resolucao: "720p", fps: Math.min(fps, 30), bitrateMbps: comTeto });
  }
  if (fps > 30) return sugestao({ resolucao, fps: 30, bitrateMbps: comTeto });
  if (bitrateMbps === null || bitrateMbps > TETO_BITRATE_REDUZIDO) {
    return sugestao({ resolucao, fps, bitrateMbps: TETO_BITRATE_REDUZIDO });
  }
  if (bitrateMbps > 1) return sugestao({ resolucao, fps, bitrateMbps: 1 });

  const menorFps = [...FPS_OPCOES].reverse().find((f) => f < fps);
  if (menorFps !== undefined) return sugestao({ resolucao, fps: menorFps, bitrateMbps });
  return null;
}

/** Quantas pessoas recebem com o envio limitado por banda ou CPU (o sinal de que baixar ajuda). */
export function espectadoresLimitados(linhas: { estado: EstadoConexao; limite: LimiteEnvio }[]): number {
  return linhas.filter((l) => l.estado === "conectado" && (l.limite === "bandwidth" || l.limite === "cpu")).length;
}
