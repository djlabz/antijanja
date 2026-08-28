import { ImageResponse } from "next/og";

/**
 * Favicon gerado em código (não dá pra gerar um `favicon.ico` via código,
 * só `icon`/`apple-icon` — ver docs/app/api-reference/file-conventions/
 * metadata/app-icons). Reaproveita o próprio vocabulário visual do
 * redesign "Fila de Créditos Cracktro" (ver DESIGN.md): o cursor âmbar
 * piscando ao lado do wordmark "SINAL" é o menor átomo da marca, então o
 * favicon é literalmente esse cursor — um bloco âmbar sólido sobre o vazio
 * preto, sem brilho/glow (o sistema não usa blur, hierarquia é opacidade).
 *
 * Cores abaixo são o equivalente sRGB das tokens `oklch` de DESIGN.md
 * (`vazio` e `sinal-ambar`) — o renderizador de `ImageResponse` (Satori)
 * não entende `oklch()`, precisa de hex/rgb.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020203", // vazio
        }}
      >
        <div
          style={{
            width: 13,
            height: 18,
            background: "#f4a437", // sinal-ambar
          }}
        />
      </div>
    ),
    { ...size }
  );
}
