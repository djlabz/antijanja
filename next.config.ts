import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Em dev o Next só aceita requisições cujo Host bate com localhost por
  // padrão. Como os amigos acessam pelo domínio do túnel (Cloudflare),
  // liberamos esses hosts aqui — ver docs/decisions.md (ADR 004).
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt"],
};

export default nextConfig;
