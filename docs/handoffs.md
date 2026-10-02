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

## 2026-08-28 - Redesign "Sinal" (sessão paralela) + alinhamento de nome
- Enquanto esta sessão trabalhava no deploy do Render, uma **sessão separada
  do Claude Code, rodando ao mesmo tempo sobre o mesmo repositório**, usou a
  skill `impeccable` (`.claude/skills/impeccable/`) pra fazer um redesign
  visual completo — tema "Fila de Créditos Cracktro" (vazio preto emissivo,
  acento âmbar, tipografia bitmap Pixelify Sans pros rótulos, sem
  cards/bordas — profundidade por opacidade) e renomeou o produto de "Tela
  Junto" pra **Sinal**. Commitado por aquela sessão como `8da14fd`.
- Percebido no meio do trabalho desta sessão quando `globals.css` e
  `layout.tsx` apareceram modificados no disco sem eu ter feito essas
  edições. Parei, expliquei a situação pro usuário (duas sessões
  concorrentes no mesmo diretório é um risco real de conflito) e perguntei
  antes de continuar — usuário confirmou que era intencional e pra manter.
- Depois que aquela sessão terminou e commitou, alinhei o resto do projeto
  que ela não tocou (não era escopo dela — ela mexeu só em código/visual):
  `package.json` (`name: "sinal"`), `render.yaml` (serviço `sinal`),
  `README.md`, `AGENTS.md`, `PRODUCT.md`, título de `docs/decisions.md` —
  tudo pra dizer "Sinal", nunca mais "Tela Junto" (ADR 018). O nome do
  repositório no GitHub continua `antijanja` de propósito — o usuário foi
  explícito que só o repo fica com o nome antigo/arbitrário, o resto (app,
  docs) deveria ser só "Sinal", pra não ter três nomes diferentes flutuando.
- Build e lint conferidos depois de juntar o trabalho das duas sessões —
  tudo passou limpo.
- **Lição registrada pro futuro** (também em `AGENTS.md`/memória): rodar
  duas sessões do Claude Code ao mesmo tempo sobre o mesmo diretório de
  projeto pode gerar exatamente esse tipo de susto — mudanças aparecendo no
  disco sem uma sessão saber da outra. Não é proibido, mas vale checar
  `git status`/`git log` com frequência quando isso acontecer.

## 2026-09-25/26 - Celular, desktop, visual arredondado, reações
- Sessão longa guiada por uso real do usuário (celular + PC). Cada bloco
  virou um commit e, quando havia decisão, um ADR (020 a 024).
- **Reconexão (ADR 020)**: o congelamento no celular era o `useSala`
  emitir `sala:entrar` uma só vez; o servidor trata a queda como saída.
  Agora entra a cada `connect`. Testado derrubando e subindo o servidor.
- **Celular (ADR 021)**, **desktop (ADR 022)**, **avisos/reações/PiP
  (ADR 024)**: ver os ADRs. Detalhe que custou tempo: aba do chat
  escondida perde a posição de rolagem e o navegador dispara um evento de
  rolagem ao reaparecer — o `Chat` ignora rolagem que vem com mudança de
  altura (`alturaRef`).
- **Visual arredondado (ADR 023)**: feito numa branch, aprovado pelo
  usuário e mesclado. O tile de vídeo precisa ter a proporção real da
  imagem, senão o canto arredondado cai num quadro preto e o vídeo parece
  reto. `DESIGN.md` foi reescrito (Shapes, Campos, Chat, Abas).
- **Bugs achados no caminho**: `--font-sans` apontava pra si mesma (app todo
  em fonte serifada); a animação das estrelas usava `transform` e movia o
  painel inteiro do estado vazio (agora anima `background-position`).
- **Como foi testado**: navegador embutido do Claude Code, duas abas na mesma
  sala (uma com `getDisplayMedia` trocado por um canvas, porque não há tela
  real pra compartilhar). Fica **sem teste real**: tela cheia (o painel a
  bloqueia — foi simulada), PiP, Wake Lock, menu de compartilhar do celular.
- **Armadilhas do ambiente**: `preview_start` recarrega a aba principal (perde
  o `getDisplayMedia` falso); matar o servidor à força pode corromper `.next`
  (tudo dá 404 — apagar `.next` resolve); `.claude/launch.json` existe só
  pra subir o servidor de teste e **não está commitado**.
- **Pendências**: ver "Próximos passos" em `docs/tasks.md` (o principal é o
  teste em celular de verdade).

## 2026-10-02 - Auditoria, servidor blindado, reconexão por sessão, aviso de falha de conexão
- Pedido: usar as skills disponíveis pra analisar o app e implementar as melhorias, na ordem de prioridade. Detalhes e motivos no **ADR 025**.
- **Feito**: validação de tudo que chega no servidor (`src/server/sinalizacao.ts`, extraído do `server.ts`); `sessao` por aba pra reconhecer a mesma pessoa voltando; `src/lib/conexoes-webrtc.ts` (fila de sinais, `origem` nos candidatos, ICE restart, estado por conexão); `VideoTile` mostra conectando/instável/falhou e trata autoplay barrado; TURN opcional por env; botões de 44px no toque; botão de remover vídeo visível no celular; testes (`npm test`, 24 casos).
- **Relato do usuário no meio do trabalho**: "tela preta pra quem assiste (celular e outro navegador); quem transmite se vê". **Não reproduzi a causa**: no ambiente de teste nem duas `RTCPeerConnection` na mesma aba fecharam (com ou sem STUN), e a versão de antes da sessão (`b9b6e0f`) falhou igual — ou seja, não é regressão dos commits de hoje, é rede/ambiente. Mas o quadro preto sem explicação era um defeito real do app (ninguém acompanhava o estado da conexão); agora aparece o motivo. Hipóteses a checar no caso real: NAT restritivo/4G sem TURN, firewall/VPN no PC de quem transmite bloqueando UDP, e autoplay com som barrado (agora tratado).
- **Armadilhas**: o `tsx watch` do `npm run dev` **reinicia o servidor** ao editar `server.ts`, `src/server/*` ou `src/lib/*` (só `app`, `components`, `hooks`, `store` ficam de fora) — quem testa com o link público do Cloudflare muda de URL a cada reinício (o túnel é refeito) e todo mundo cai. Pra desfazer um teste com versão antiga: `git stash` + `git checkout <commit> -- src server.ts` e depois `git checkout HEAD -- src server.ts` + `git stash pop`. O hook de design do impeccable avisa "Suppressing further design hints" depois de 6 edições no mesmo arquivo.
- **Pendências**: ver "Próximos passos" em `docs/tasks.md`.
- **Tela preta resolvida (confirmado pelo usuário)**: era o PortMaster ligado no PC dele, filtrando a rede. Desligado, voltou tudo. Lição: quando o vídeo não chega mas chat/sinalização funcionam, desconfie de firewall/VPN/gerenciador de portas no PC de quem transmite *e* no de quem assiste antes de mexer em código; o app agora mostra "Não foi possível conectar com X" nesse caso.
- **PiP (ADR 026)**: botão "Janela flutuante" no cabeçalho + abertura automática ao trocar de aba (Media Session). O automático não deu pra ver abrindo sozinho no ambiente de teste (o PiP por código exige clique recente); confirmar num uso real.

## 2026-10-02 (2) - Segunda auditoria: segurança da sala, CI, painel do transmissor, notificações, prévia do link
- Feito na ordem combinada com o usuário, um commit por bloco (ADRs **027, 028, 029**). Resumo: pacote rápido (texto "você foi convidado" errado pro anfitrião, código normalizado, `selfBrowserSurface`, limpeza), CI + headers + healthcheck + logs, painel `StatusTransmissao`, notificações do sistema, código de 8/limite por IP/sala trancável, prévia do link.
- **Testes**: 49 (`npm test`): servidor, parser do YouTube, código de sala e `conexoes-webrtc` com `RTCPeerConnection` falsa (fila de sinais, origem, ICE restart, estados, saúde). O ICE restart agora está testado na lógica, mas continua sem teste numa queda de rede real.
- **Armadilhas**: (1) `document.hidden` fica `true` no navegador embutido quando o painel está oculto — o painel do transmissor e `useAvisos` pausam por isso; nos testes use `Object.defineProperty(document, "hidden", { get: () => false })`. (2) Apagar `.next` some com os tipos globais do Next (`LayoutProps`): `tsc` só passa depois de `npm run build` ou de subir o dev. (3) Testes com `http.close()` ficam pendurados se houver sockets abertos — feche com `io.close()`. (4) `tsx watch` reinicia o servidor ao editar `server.ts`/`src/server`/`src/lib`.
- **Não verificado**: cartão no WhatsApp, `RENDER_EXTERNAL_URL` no Render, CI no GitHub, notificação real do Windows.

## 2026-10-02 (3) - Voz do Discord duplicada ao compartilhar a tela inteira
- Pedido do usuário: ao compartilhar a tela toda com áudio, quem está no Discord ouve as vozes duas vezes. **ADR 030**: `windowAudio: "window"`, aviso quando é tela inteira com áudio, botão pra ligar/desligar o áudio da transmissão (`track.enabled`), README com as 4 saídas.
- O app **não consegue** separar o Discord do áudio do sistema na tela inteira; o que resolve de verdade é compartilhar aba/janela ou separar as saídas de áudio no Windows. Isso último e o "áudio da janela" não foram testados num Windows real.
- Teste no navegador embutido: `getDisplayMedia` falso com trilha de áudio e `getSettings()` sobrescrito (`displaySurface: "monitor"` ou `"browser"`).

## 2026-10-02 (4) - Auditoria Impeccable da sala e da home (ADR 031)
- Pedido: passar pelas skills do Impeccable (critique/audit/harden/adapt/clarify/optimize) e "resolver todas". Medi no navegador embutido (contraste via canvas, alvos de toque, scroll horizontal) e corrigi em 5 commits locais (`efd3386`, `38ddc00`, `0d58cca`, `518494c`, `7ce44cf`), **sem push** (o `eecf94e` do ADR 030 também segue só local).
- Achados que a leitura do código não mostrava e a medição sim: o cabeçalho estourava em tablet com toque (943px em 780px) depois dos alvos de 44px; botões com texto `hidden sm:inline` ficavam sem nome acessível no celular; convidado entrava/saía/entrava (log do servidor).
- 61 testes (`captura-de-tela`, `reacoes-store`, motivo da recusa). Lint e tsc limpos.
- Pendente: ver tudo num celular/iPad de verdade; ADR 031 lista o que não foi verificado.
- O usuário adicionou skills em `.claude/skills/` (frontend-design, webapp-testing, TDD, systematic-debugging, karpathy-guidelines, grill-me, etc.); ainda não usei todas — só o TDD no helper de captura.

