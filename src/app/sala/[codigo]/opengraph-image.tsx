import { ImageResponse } from "next/og";

/**
 * Prévia do link de convite de UMA sala: mostra o código, pra quem recebe no
 * WhatsApp ver pra onde o link leva antes de abrir.
 */
export const alt = "Convite pra uma sala do Sinal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: bruto } = await params;
  let codigo = bruto;
  try {
    codigo = decodeURIComponent(bruto);
  } catch {
    // código com `%` solto: mostra como veio.
  }
  // Vem da URL (qualquer um escreve): limita pra não estourar a imagem.
  const exibido = codigo.length > 22 ? `${codigo.slice(0, 21)}…` : codigo;

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
        <div style={{ display: "flex", fontSize: 40, letterSpacing: 4, color: "#f4a437" }}>
          VOCÊ FOI CONVIDADO PRA SALA
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 28 }}>
          <div style={{ fontSize: exibido.length > 12 ? 130 : 200, fontWeight: 700, lineHeight: 1 }}>
            {exibido}
          </div>
          <div
            style={{
              width: 56,
              height: 150,
              marginLeft: 22,
              marginBottom: 10,
              background: "#f4a437", // sinal-ambar
            }}
          />
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 36, color: "#a9a9ad" }}>
          Sinal — compartilhe a tela com os amigos, sem cadastro.
        </div>
      </div>
    ),
    { ...size }
  );
}
