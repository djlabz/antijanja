/**
 * Presets de qualidade de transmissão — resolução, taxa de quadros e
 * bitrate máximo. Sem isso, `getDisplayMedia({ video: true })` deixa o
 * navegador escolher (geralmente a resolução nativa do monitor, sem limite
 * de fps nem de bitrate), o que sobrecarrega o encoder e derruba quadros —
 * era a causa da transmissão travando mesmo testando localmente entre duas
 * abas. Ver docs/decisions.md (ADR 011).
 */

export const RESOLUCOES = {
  "720p": { largura: 1280, altura: 720, rotulo: "720p" },
  "1080p": { largura: 1920, altura: 1080, rotulo: "1080p" },
  nativa: { largura: undefined, altura: undefined, rotulo: "Nativa (sem limite)" },
} as const;

export type ResolucaoId = keyof typeof RESOLUCOES;

export const FPS_OPCOES = [15, 24, 30, 60] as const;

export const BITRATE_OPCOES: { valor: number | null; rotulo: string }[] = [
  { valor: 1, rotulo: "1 Mbps" },
  { valor: 2, rotulo: "2 Mbps" },
  { valor: 4, rotulo: "4 Mbps" },
  { valor: 6, rotulo: "6 Mbps" },
  { valor: 8, rotulo: "8 Mbps" },
  { valor: null, rotulo: "Sem limite" },
];

export function construirConstraintsVideo(
  resolucao: ResolucaoId,
  fps: number
): MediaTrackConstraints {
  const preset = RESOLUCOES[resolucao];
  return {
    ...(preset.largura && preset.altura
      ? { width: { ideal: preset.largura }, height: { ideal: preset.altura } }
      : {}),
    frameRate: { ideal: fps, max: fps },
  };
}

/**
 * Limita o bitrate de vídeo de uma conexão P2P onde EU sou quem manda a
 * tela (`RTCRtpSender`, não o lado que recebe — bitrate é decidido por
 * quem envia). `bitrateMbps: null` remove o limite.
 */
export async function aplicarLimiteBitrate(
  pc: RTCPeerConnection,
  bitrateMbps: number | null
): Promise<void> {
  const sender = pc.getSenders().find((s) => s.track?.kind === "video");
  if (!sender) return;

  const parametros = sender.getParameters();
  if (!parametros.encodings || parametros.encodings.length === 0) {
    parametros.encodings = [{}];
  }
  parametros.encodings[0].maxBitrate = bitrateMbps ? bitrateMbps * 1_000_000 : undefined;

  try {
    await sender.setParameters(parametros);
  } catch {
    // Alguns navegadores recusam `setParameters` antes da primeira
    // negociação terminar — sem problema, quem chama isso de novo depois
    // (ex: ao trocar as configurações) tenta de novo.
  }
}
