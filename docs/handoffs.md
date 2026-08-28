# Log de handoffs

## 2026-08-27 - Criação do projeto
- Escopo combinado com o usuário: MVP "essencial" (sala com nome, sem
  cadastro; compartilhar tela; chat; sem lista pública nem contas).
- Exposição pra fora da rede: `cloudflared` via npx (quick tunnel, sem
  conta), disparado por `npm run share`. Ver ADR 005.
- Conjunto de convenções copiado do projeto PaceOS
  (`E:\-Progamacoes\projects\paceos`): Next.js App Router + TypeScript
  strict, Tailwind v4 + Shadcn UI (`components.json` idêntico, preset
  `base-nova`), Zustand, alias `@/`, componentes em PascalCase, textos de UI
  em PT-BR, Server Components por padrão com lógica interativa isolada em
  Client Components, `docs/features/NNN-nome.md` + `docs/decisions.md`
  (ADR) + `docs/tasks.md` + `docs/handoffs.md`.
- Deliberadamente **não copiado**: Drizzle/Postgres, Better Auth, AI SDK e o
  pipeline de agentes `.github/agents/` (feature-contract → implementer →
  ship-check → save-handoff) — não fazem sentido pra um projeto solo sem
  banco de dados nem equipe de agentes especializados rodando nele. Se isso
  crescer, vale reavaliar.
- Servidor customizado (Next + Socket.IO no mesmo processo) porque
  sinalização WebRTC não cabe no modelo de Server Actions do PaceOS — ver
  ADR 002.
- Projeto criado numa pasta separada (`tela-junto`) por engano; movido pra
  `E:\-Progamacoes\projects\antijanja` (diretório que o usuário já tinha
  preparado pra ele) — nome do pacote em `package.json` continua
  `tela-junto` (cosmético, sem relação com a pasta).

## 2026-08-27 - Redesign visual + diálogo de convite + tela cheia
- Pedido do usuário: tema escuro "premium" inspirado no print de um app
  concorrente (GoLive), link de convite direto (sem "digite esse código"),
  botão de tela cheia no vídeo de quem compartilha, e uma explicação de como
  não vazar o áudio do Discord na transmissão (o grupo usa Discord à parte
  pra voz). Usado como referência de processo a skill `impeccable`
  (`.claude/skills/impeccable/`) que o usuário tinha acabado de adicionar ao
  projeto — carregada manualmente (não aparecia ainda na listagem de skills
  desta sessão) via `context.mjs` + `reference/new-work.md` +
  `reference/craft-floor.md`; a etapa de "sortear direções visuais" foi
  pulada porque a direção já vinha fixada pelo usuário (print + "escuro,
  premium" + elementos específicos a copiar) — o próprio processo da skill
  diz que uma direção fixada pelo usuário vale mais que o sorteio.
- Tema: `src/app/globals.css` reescrito pra um único tema escuro (ADR 007) —
  sem alternância, sem `next-themes`.
- Novo componente `CompartilharSalaDialog` (`src/components/sala/`): link
  pronto pra colar, com feedback visual de "copiado". Achado e corrigido um
  bug real nesse componente durante o teste (ADR 009): o link vinha errado
  (apontava pra `/` em vez de `/sala/[codigo]`) quando a sala era acessada
  por navegação client-side (o fluxo normal: preencher nome na home →
  entrar). Só funcionava certo depois de um refresh completo — corrigido
  trocando `window.location.href` por `usePathname()`.
- `VideoTile` ganhou botão de tela cheia (Fullscreen API nativa).
- Isolamento do áudio do Discord: não dá pra fazer isso por código (ADR
  008) — é o navegador quem decide o que capturar, dependendo de "aba" vs
  "tela inteira" escolhido no seletor nativo. Documentado onde a decisão é
  tomada (tooltip + texto no estado vazio), mais um ajuste técnico
  (`echoCancellation`/`noiseSuppression`/`autoGainControl` desligados —
  processamento de voz que atrapalha áudio de vídeo/jogo).
- Achado e corrigido um bug de layout durante o teste responsivo (mobile,
  375px): o cabeçalho não quebrava linha e estourava a largura da tela —
  corrigido escondendo os rótulos de texto dos botões abaixo do breakpoint
  `sm`, deixando só os ícones (com `aria-label`/tooltip mantendo
  acessibilidade).
- `eslint.config.mjs` passou a ignorar `.agent(s)/`, `.claude/`, `.codex/`,
  `.gemini/`, `.opencode/` — diretórios de configuração de ferramentas de IA
  que passaram a existir na raiz do projeto e não são código do app.
- Primeiro commit do projeto e `git remote add origin` pro repositório do
  usuário no GitHub (`.agent`, `.agents`, `.codex`, `.gemini`, `.opencode` —
  todos vazios ou cópias duplicadas da mesma skill `impeccable` que já
  existia em `.claude/` — ficaram de fora do commit via `.gitignore`, pra
  não versionar ~370 mil linhas de script vendorizado de ferramenta local).

## 2026-08-27 - Limpeza de skills duplicadas, Docker, push
- A pedido do usuário: apagadas as pastas `.agent/`, `.agents/`, `.codex/`,
  `.gemini/`, `.opencode/` do disco (não só do git) — só sobrou `.claude/`,
  que é a única realmente usada nesta sessão. As quatro primeiras já
  estavam vazias; `.opencode/` tinha uma cópia idêntica da skill
  `impeccable` que também existe em `.claude/skills/`.
- `Dockerfile` + `docker-compose.yml` (ADR 010): `docker compose up` builda
  a imagem e sobe dois serviços, `app` (Next + Socket.IO, produção) e
  `tunnel` (`cloudflare/cloudflared` oficial, mesmo túnel gratuito do
  `npm run share`). Testado de ponta a ponta neste ambiente: build, subida
  dos dois containers, entrada numa sala pelo link público do túnel gerado
  pelo Docker — tudo funcionando antes de derrubar o teste
  (`docker compose down`).
- `tsx` e `cross-env` movidos de `devDependencies` pra `dependencies` no
  `package.json` — passaram a ser dependência de runtime de verdade
  (`server.ts` roda via `tsx` também em `npm run start`/produção, não só em
  dev), independente de Docker.
- Commit e `git push -u origin main` feitos a pedido explícito do usuário.

## 2026-08-27 - Qualidade de transmissão, link público automático, bug crítico corrigido
- Usuário reportou transmissão travando/com qualidade ruim mesmo testando
  localmente entre duas abas — sinal de gargalo de CPU/encoder por falta de
  limite na captura, não de rede. Pediu um painel de qualidade
  (resolução/fps/bitrate) igual ao de apps concorrentes, padrão 1080p/30fps/
  4 Mbps.
- Também reportou que o link do "Compartilhar sala" vinha com `localhost`
  rodando `npm run share` — porque quem hospeda abre `localhost` no próprio
  navegador, e o túnel do Cloudflare rodava num processo separado
  (`concurrently`) que o app não tinha como enxergar a URL gerada.
- Implementado (ADR 011): `src/lib/qualidade-transmissao.ts` (presets +
  `construirConstraintsVideo`/`aplicarLimiteBitrate`) e
  `useConfigTransmissaoStore` (localStorage). Painel novo
  `ConfigTransmissaoPopover` (ícone de engrenagem no topo). `server.ts`
  passou a subir o `cloudflared` ele mesmo via `child_process.spawn` (só
  quando `TUNNEL=cloudflare`), ler a URL pública da própria saída do
  processo e avisar todo mundo conectado (evento `link:publico`) — o
  `CompartilharSalaDialog` prefere isso à origem do navegador. `npm run
  share` simplificado pra só setar essa env var (removido `concurrently` e
  o script `tunnel` separado). O mesmo mecanismo resolveu o problema
  idêntico no Docker de graça — `docker-compose.yml` deixou de precisar de
  um serviço `tunnel` separado (só `app`, com `TUNNEL: cloudflare`).
- **Bug crítico achado e corrigido durante o teste, não pedido pelo
  usuário** (ADR 012): fechar o `Dialog`/`Popover` do Shadcn (base em
  `@base-ui/react`) deixava o conteúdo (e, no caso do Dialog, o overlay de
  tela cheia) preso visível na tela, travando qualquer clique no resto do
  app — mesmo com o estado interno (`data-closed`) correto. Reproduzido de
  forma consistente e sistemática (não era instabilidade do ambiente de
  teste). Corrigido tornando os dois componentes controlados
  (`open`/`onOpenChange` com `useState` próprio) e desmontando o conteúdo
  condicionalmente em vez de confiar na animação de saída da biblioteca.
- Testado de ponta a ponta neste ambiente: `npm run share` de verdade,
  túnel subindo, evento `link:publico` recebido por um cliente Node
  standalone e por uma aba real em `localhost`, diálogo mostrando a URL
  pública correta, painel de qualidade abrindo/aplicando/persistindo em
  `localStorage`, e o bug do Dialog/Popover reproduzido e depois confirmado
  corrigido. Não testado (não dá pra automatizar): a qualidade de vídeo
  em si numa transmissão real — `getDisplayMedia` exige um seletor nativo
  do SO que não responde a automação.

## 2026-08-27 - Hydration mismatch causado por extensão de navegador
- Usuário reportou erro de "hydration mismatch" do React ao entrar pelo
  link direto. Causa (visível no próprio stack trace do erro): a extensão
  de navegador Monica injeta `monica-id`/`monica-version` no `<body>` antes
  do React hidratar — não é bug do app (ver ADR 013). Corrigido com
  `suppressHydrationWarning` em `<html>` e `<body>` (`src/app/layout.tsx`).

## 2026-08-28 - Auto-copy do link, identidade dentro da sala, vídeo do YouTube
- Três pedidos do usuário: (1) o botão "Compartilhar sala" devia copiar o
  link sozinho, sem precisar de um segundo clique; (2) quem entra por um
  link direto sem nome salvo ficava numa tela preta — devia aparecer uma
  tela pra escolher nome ou entrar como "Convidado N" (numerado); (3) uma
  função de adicionar vídeo do YouTube que funcione como "controle remoto"
  sincronizado pra sala inteira, inspirada num print de referência de um
  app concorrente (que também mostrava Twitch/Kick, não pedidos).
- (1) resolvido trivialmente: o `onClick` do próprio gatilho do diálogo
  (`DialogTrigger`) chama `copiar()` direto, sem esperar clique no botão
  de dentro do diálogo.
- (2)+(3) implementados juntos (ADR 014 e 015 em `docs/decisions.md`):
  `EscolherNomeSala` (tela nova, dentro da sala) + servidor atribuindo
  "Convidado N" quando o nome chega vazio; `YoutubePlayer` +
  `AdicionarFonteDialog` + estado de fonte de vídeo por sala no servidor
  (`FonteVideo`, com "só eu"/"qualquer um controla"), sincronizado por
  comandos (tocar/pausar/carregar) mais um heartbeat de 5s. `src/lib/youtube.ts`
  faz o parsing da URL, compartilhado entre cliente e `server.ts`.
- **Bug crítico achado e corrigido durante o teste, não pedido pelo
  usuário** (ADR 016): ao implementar (2), reproduzi de forma consistente
  (não é falha de ambiente de teste) uma condição de corrida real no fluxo
  antigo "digitar nome na home → navegar pra sala" — o Next empacota
  `usuario-store.ts` numa cópia por rota, então "/" e "/sala/[codigo]"
  tinham cada um sua PRÓPRIA instância do mesmo store Zustand, e as duas
  escreviam no mesmo `sessionStorage` quase ao mesmo tempo, uma podendo
  gravar um `hidratado: false` parcial que a outra lia como definitivo —
  travando a entrada na sala pra sempre em alguns casos. Corrigido
  removendo `hidratado` do estado persistido (virou um hook próprio via
  `useSyncExternalStore` sobre a API nativa do zustand-persist) e, mais
  importante, removendo a coleta de nome da home inteiramente — o nome
  agora é SEMPRE decidido dentro da própria sala, nunca precisa saltar
  entre instâncias de store de rotas diferentes.
- Testado de ponta a ponta neste ambiente, com o dev server rodando de
  verdade: link direto sem nome → tela de escolha → nome digitado ("Ana")
  e "Convidado" clicado em duas abas separadas na mesma sala → numeração
  "Convidado 1"/"Convidado 2" corretas, contagem de participantes
  correta nas três abas. Auto-copy confirmado instrumentando
  `navigator.clipboard.writeText` (o ambiente de teste nega permissão de
  clipboard de verdade, mas confirma que a chamada acontece no clique do
  gatilho, não precisa de um segundo clique). Vídeo do YouTube testado com
  um link real (`dQw4w9WgXcQ`) — carregou de verdade (IFrame API real,
  título do vídeo apareceu), sincronizou pra quem entrou depois já vendo o
  vídeo carregado sem poder controlar (permissão "só eu"), e remover
  sincronizou pros dois lados.
- Testei também a sincronia de play/pause de verdade (não só o carregamento
  do vídeo): dei play numa aba, a outra começou a tocar ~1s depois; dei
  pause, a outra pausou junto. Usei um hook de debug temporário
  (`window.__ytDebug = playerRef.current`, removido antes de terminar —
  `git status` limpo depois) pra conseguir ler o estado do player de dentro
  do iframe do YouTube (cross-origin, não dá pra inspecionar de fora).

## 2026-08-28 - Deploy no Render
- Usuário perguntou se dava pra hospedar no Render de graça — já tinha
  conta criada lá, só queria saber como fazer o deploy. Confirmei os
  limites reais do plano free (via busca na documentação oficial do Render
  e fontes de terceiros, não assumido): sem cartão de crédito, 750h
  grátis/mês, dorme depois de 15min sem tráfego (cold start de 30-60s),
  WebSocket funciona sem timeout fixo documentado. Isso é uma mudança de
  arquitetura em relação ao objetivo original (rodar no próprio PC do
  usuário) — documentado como trade-off explícito, não escondido (ADR 017).
- Adicionado `render.yaml` (Blueprint do Render, `runtime: docker`, plano
  `free`, aponta pro `Dockerfile` já existente — nenhuma mudança nele foi
  necessária) e uma seção no README com o passo a passo do deploy pela UI
  do Render (Blueprint → conectar repo → Apply). De propósito sem
  `TUNNEL=cloudflare`: o Render já é público por conta própria, e o
  diálogo "Compartilhar sala" já cai pra `window.location.origin` sozinho
  quando não tem `linkPublico` de túnel.
