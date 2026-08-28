# Backlog

## Feito
- [x] Sala com nome + código, sem cadastro (`docs/features/000-sala-compartilhamento-tela.md`).
- [x] Compartilhamento de tela P2P (mesh, sem SFU).
- [x] Chat de texto por sala.
- [x] `npm run share` — sobe o servidor + túnel Cloudflare pra convidar os amigos.
- [x] Tema escuro único, visual "premium" (ADR 007).
- [x] Diálogo "Compartilhar sala" com link direto pra sala, já com correção
      de um bug real de timing de navegação (ADR 009).
- [x] Botão de tela cheia no vídeo de quem está compartilhando.
- [x] Dica de como isolar o áudio do Discord (aba do navegador em vez de
      tela inteira) — ADR 008.

## Próximos passos possíveis (não iniciados)
- [ ] Lista de salas públicas (`/salas`) — precisa decidir se isso quebra o
      ADR 001 (nada em memória sobrevive a reinício, então "pública" só
      significa "listada pros que já sabem o endereço do servidor").
- [ ] Indicador de qualidade de conexão por participante.
- [ ] Áudio/webcam além da tela.
- [ ] Named Tunnel da Cloudflare com subdomínio fixo (evita ter que reenviar
      o link a cada `npm run share`) — precisa de conta gratuita na Cloudflare.
