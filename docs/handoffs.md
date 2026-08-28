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
