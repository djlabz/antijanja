import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Em dev o Next só aceita requisições cujo Host bate com localhost por
  // padrão. Como os amigos acessam pelo domínio do túnel (Cloudflare),
  // liberamos esses hosts aqui — ver docs/decisions.md (ADR 004).
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt"],

  // Cabeçalhos básicos de segurança. Não há CSP nem restrição de
  // `fullscreen`/`autoplay`: o player do YouTube embutido (ADR 015) precisa
  // deles, e uma política restritiva demais quebraria o botão de tela cheia.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Ninguém tem motivo pra embutir o Sinal em outro site.
          { key: "X-Frame-Options", value: "DENY" },
          // O app nunca usa câmera/microfone/localização; tela, só a própria página.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), display-capture=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
