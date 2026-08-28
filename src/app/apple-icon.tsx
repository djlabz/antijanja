import { ImageResponse } from "next/og";

/**
 * Ícone pra adicionar o Sinal à tela inicial no iOS — mesma composição do
 * favicon (`icon.tsx`), só em resolução maior. Ver `icon.tsx` pro porquê
 * do desenho (o cursor âmbar do wordmark) e das cores em hex.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 73,
            height: 101,
            background: "#f4a437", // sinal-ambar
          }}
        />
      </div>
    ),
    { ...size }
  );
}
