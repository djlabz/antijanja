import { ImageResponse } from "next/og";

/**
 * Imagem da prévia do link (WhatsApp, Discord, Telegram...) — o cartão que
 * aparece quando alguém cola o endereço do Sinal numa conversa. Mesmo
 * vocabulário do favicon e do DESIGN.md: vazio preto, o wordmark e o bloco
 * âmbar do cursor. Cores em hex (o Satori não entende `oklch`).
 */
export const alt = "Sinal — compartilhe sua tela com os amigos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#020203", // vazio
          color: "#f4efe6", // marfim
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{ fontSize: 220, fontWeight: 700, letterSpacing: 6, lineHeight: 1 }}>
            SINAL
          </div>
          <div
            style={{
              width: 90,
              height: 170,
              marginLeft: 24,
              marginBottom: 14,
              background: "#f4a437", // sinal-ambar
            }}
          />
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 44, color: "#a9a9ad" }}>
          Compartilhe a tela com os amigos.
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 32, color: "#6b6b70" }}>
          Sem cadastro. Sem servidor pago.
        </div>
      </div>
    ),
    { ...size }
  );
}
