/**
 * Configuração de ICE só com servidores STUN públicos e gratuitos — sem
 * TURN. Funciona pra maioria das redes domésticas (o vídeo sai direto do PC
 * de quem compartilha pro PC de quem assiste). Ver docs/decisions.md (ADR 003)
 * pra saber quando isso não é suficiente e o que fazer a respeito.
 */
export const configuracaoIce: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};
