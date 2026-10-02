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
- [x] Favicon no mesmo estilo do redesign (`src/app/icon.tsx` +
      `apple-icon.tsx`, gerados em código com `next/og`).
- [x] Corrigido bug de qualidade: quem assistia via compartilhamento de tela
      recebia algo tipo 160p/360p mesmo com preset em 1080p — o encoder
      derrubava resolução pra manter fps sob aperto de banda. Agora derruba
      fps, mantém resolução (ADR 019).

- [x] Reconexão automática: quem cai (celular bloqueando a tela, rede
      oscilando) reentra na sala e retoma o vídeo sozinho (ADR 020).
- [x] Celular: vídeo fixo no topo, abas Chat/Participantes, tela cheia em
      paisagem + duplo toque, tela sempre acesa (Wake Lock), faixa
      "Reconectando…" (ADR 021).
- [x] Chat: horário em cada mensagem, balões, rolagem que não puxa a
      página, teclado do celular não fecha a cada envio, contador de não lidas.
- [x] Desktop: modo cinema, destaque de tela, volume/mudo por transmissão,
      estatísticas de recepção, chat sobreposto em tela cheia, atalhos
      `F` `M` `C` `P` `/`, aviso no título da aba + bipe (ADR 022, 024).
- [x] Visual arredondado (pílulas, balões, avatares redondos) — experimento
      aprovado e mesclado na `main` (ADR 023). Corrigida a fonte (Geist não
      carregava) e a animação que movia o painel do estado vazio.
- [x] Estado vazio com convite ("Você está sozinho por aqui" + copiar link),
      rótulos de 12px, transições e respeito a "reduzir movimento".
- [x] Avisos "fulano entrou/saiu", reações flutuantes, Picture-in-Picture,
      controles que somem em tela cheia, compartilhar pelo menu do celular
      (ADR 024).

- [x] Servidor à prova de payload malformado, reconexão por sessão (nome não
      é mais recusado ao voltar), conexões WebRTC com estado + aviso quando
      falham, TURN opcional por variável de ambiente, testes do servidor
      (`npm test`) — ADR 025.

- [x] Botão "Janela flutuante" (PiP) no cabeçalho + PiP automático ao trocar
      de aba (ADR 026). A "tela preta" reportada era o PortMaster no PC do
      usuário — resolvido por fora do app (ADR 025).

- [x] Pacote da 2ª auditoria (ADRs 027-029): texto da tela de nome, código da
      sala tratado e de 8 caracteres com `crypto`, limite de tentativas por IP,
      sala trancável, CI no GitHub, headers de segurança, healthcheck, logs do
      servidor, painel de quem recebe (transmissor), estimativa de upload,
      notificações do sistema, prévia do link (Open Graph), `selfBrowserSurface`,
      limpeza de arquivos sobrando; testes de parser, código e conexões WebRTC
      (49 no total).

- [x] Áudio ao compartilhar: `windowAudio`, aviso de tela inteira com áudio,
      botão pra ligar/desligar o áudio da transmissão (ADR 030).

- [x] Auditoria Impeccable da sala e da home (ADR 031): captura que falhava em
      silêncio, contraste, alvos de 44px, tablet, motivo do erro de entrada,
      convidado conectando duas vezes, reações fora do estado da sala.

- [x] Chat: histórico das últimas 50 mensagens pra quem entra/reconecta,
      links clicáveis, lista limitada a 200 no cliente (contagem por total) e
      "Conectando à sala…" no lugar de "Você está sozinho" (ADR 032).

- [x] Revisão com as skills (ADR 033): log de subida do servidor, roteiros de
      reconexão em `e2e/`, regra única de pendentes, cabeçalho dividido.

## Próximos passos possíveis (não iniciados)
- [ ] Ver a sala num **iPad/celular de verdade** (cabeçalho em duas linhas,
      alvos de 44px, captura sem suporte) e com **leitor de tela**; medir o
      ganho das reações com o Profiler (ADR 031).
- [ ] Cabeçalho em tablet com o painel do transmissor + áudio + janela
      flutuante juntos: pode quebrar em três linhas; ver se vale um menu "Mais".
- [ ] Confirmar no Windows o "áudio da janela" do Chrome 141 e o truque de
      separar a saída do Discord (ADR 030); ajustar o README conforme o que
      funcionar de verdade.
- [ ] **Ver o CI rodar no GitHub** (workflow criado, nunca executado lá) e o
      cartão de prévia no WhatsApp com uma URL pública de verdade.
- [ ] Ver a notificação do Windows e o painel do transmissor com 3+
      espectadores num uso real.
- [ ] Docker rodar como usuário `node` (não testado aqui: `npx tsx` precisa de
      cache gravável).
- [ ] Ajuste automático do bitrate pelo número de espectadores (precisa o
      usuário informar o upload dele; o app não consegue medir sozinho).
- [ ] **Ver o PiP automático abrir num uso real** (trocar de aba com uma
      transmissão tocando) e conferir se também abre ao ir pra outro programa.
- [ ] Testar o ICE restart de ponta a ponta (derrubar a rede por uns segundos
      no meio de uma transmissão); não foi possível no ambiente de teste.
- [ ] **Testar num celular de verdade** o que só foi simulado: tela cheia em
      paisagem, Wake Lock, PiP, menu de compartilhar nativo, teclado.
- [x] Servidor TURN: decidido **não** provisionar (ADR 033). O código segue
      aceitando as variáveis de ambiente; o aviso de falha de conexão explica.
- [ ] Zoom com pinça no vídeo (celular).
- [ ] Instalar como app (PWA).
- [ ] Limpar o cabeçalho no celular (vários ícones sem texto; "Compartilhar
      tela" não funciona na maioria dos navegadores de celular).
- [ ] Animar a troca entre "todas as telas" e "destaque".
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
