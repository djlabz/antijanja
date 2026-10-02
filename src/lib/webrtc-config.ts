import type { IceServerConfig } from "@/lib/socket-events";

/**
 * STUN públicos e gratuitos de base. Funcionam pra maioria das redes
 * domésticas (o vídeo sai direto do PC de quem compartilha pro PC de quem
 * assiste), mas NÃO atravessam NAT mais restritivo (4G de várias operadoras,
 * redes corporativas, alguns roteadores): aí a conexão falha e só um servidor
 * TURN resolve. Quem hospeda pode somar um via variáveis de ambiente — ver
 * docs/decisions.md (ADR 003 e 025) e o README.
 */
const STUN_PADRAO: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export function montarConfiguracaoIce(extras: IceServerConfig[] = []): RTCConfiguration {
  return { iceServers: [...STUN_PADRAO, ...extras] };
}
