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
- [x] `docker compose up` — app + túnel Cloudflare num comando só, pra quem
      clonar o repositório sem precisar instalar Node (ADR 010).
- [x] Painel de qualidade de transmissão (resolução/fps/bitrate), padrão
      1080p/30fps/4 Mbps — corrige travamento por captura sem limite (ADR 011).
- [x] Link de "Compartilhar sala" já vem com a URL pública do túnel mesmo
      quando quem hospeda está em `localhost` (ADR 011).
- [x] Corrigido bug crítico: `Dialog`/`Popover` ficavam presos na tela depois
      de fechados (ADR 012).
- [x] `suppressHydrationWarning` em `<html>`/`<body>` — hydration mismatch
      causado por extensão de navegador (Monica), não por bug do app (ADR 013).
- [x] Link de "Compartilhar sala" copia sozinho ao clicar, sem precisar de
      um segundo clique no botão de copiar.
- [x] Tela de identificação dentro da própria sala (nome digitado ou
      "Continuar como convidado", numerado pelo servidor) — corrige quem
      entrava por link direto e ficava preso numa tela preta (ADR 014).
- [x] Vídeo do YouTube sincronizado ("controle remoto" pra sala inteira,
      com permissão de controle configurável) — ADR 015.
- [x] Corrigido bug crítico de condição de corrida entre duas instâncias do
      store de nome (uma por rota) que podia travar a entrada na sala pra
      sempre — nome agora é decidido só dentro da própria sala (ADR 016).
- [x] `render.yaml` — deploy opcional no Render (grátis, sem depender do PC
      do usuário ligado; troca "seu processamento" por "sempre disponível") — ADR 017.
- [x] Redesign visual completo ("Fila de Créditos Cracktro" — tema âmbar,
      sem cards/bordas, tipografia bitmap) e rename do produto pra **Sinal**
      (repositório GitHub continua `antijanja`) — ADR 018.

## Próximos passos possíveis (não iniciados)
- [ ] Lista de salas públicas (`/salas`) — precisa decidir se isso quebra o
      ADR 001 (nada em memória sobrevive a reinício, então "pública" só
      significa "listada pros que já sabem o endereço do servidor").
- [ ] Indicador de qualidade de conexão por participante.
- [ ] Áudio/webcam além da tela.
- [ ] Named Tunnel da Cloudflare com subdomínio fixo (evita ter que reenviar
      o link a cada `npm run share`) — precisa de conta gratuita na Cloudflare.
- [ ] Investigar a causa raiz do bug do ADR 012 do lado da biblioteca
      (`@base-ui/react`/`tw-animate-css`) — hoje contornado, não corrigido na origem.
- [ ] Twitch/Kick como fonte de vídeo (só YouTube por enquanto — ADR 015).
- [ ] Indicador de tela cheia / fullscreen pro player do YouTube (o
      `VideoTile` de compartilhamento de tela já tem, o `YoutubePlayer` ainda não).
