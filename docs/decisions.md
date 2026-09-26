# Registro de Decisões de Arquitetura (ADR) - Sinal (era "Tela Junto")

## ADR 001 - Sem banco de dados, estado só em memória
- **Data**: 2026-08-27
- **Contexto**: O objetivo do projeto é rodar de graça, direto do PC de quem hospeda a sessão, sem nenhum serviço pago no meio (ver `README.md`).
- **Decisão**: Salas e participantes vivem só em memória do processo Node (`src/server/rooms.ts`, um `Map`). Não existe Postgres, Drizzle ou qualquer persistência. Reiniciar o servidor apaga todas as salas — é o esperado, não um bug.
- **Efeito prático**: Sem conta, sem histórico entre sessões, sem lista de salas públicas nesta primeira versão (escopo "essencial" combinado com o usuário). Adicionar persistência ou contas exigiria repensar essa decisão.

---

## ADR 002 - Servidor customizado (Next + Socket.IO no mesmo processo), não Server Actions
- **Data**: 2026-08-27
- **Contexto**: A convenção copiada do PaceOS (`AGENTS.md` de lá) evita Route Handlers e prefere Server Actions para qualquer comunicação cliente-servidor. Isso funciona bem pra CRUD, mas sinalização WebRTC (trocar ofertas SDP e candidatos ICE entre navegadores) precisa de um canal bidirecional persistente — pedido/resposta não serve.
- **Decisão**: `server.ts` na raiz cria um `http.Server` manual, entrega as rotas do Next (`next({ turbopack: true })`) e pendura um `Server` do Socket.IO em cima, tudo na mesma porta. `npm run dev`/`npm run start` rodam esse arquivo via `tsx` em vez de `next dev`/`next start`.
- **Efeito prático**: `server.ts` e `src/server/*` importam `src/lib/socket-events.ts` por caminho relativo (não pelo alias `@/`), porque rodam fora do bundler do Next. Esse arquivo de eventos não pode importar nada além de tipos puros — é o contrato compartilhado entre os dois mundos.

---

## ADR 003 - WebRTC mesh (P2P direto), sem SFU e sem TURN
- **Data**: 2026-08-27
- **Contexto**: Compartilhamento de tela pra um grupo pequeno de amigos. Um servidor de mídia (SFU, tipo LiveKit/mediasoup) evitaria que quem compartilha precise de uma conexão de upload por espectador, mas exigiria hospedar e rotear vídeo — custo e complexidade que contrariam o objetivo do projeto.
- **Decisão**: Cada pessoa que compartilha a tela abre uma `RTCPeerConnection` direta com cada espectador (mesh só do lado de quem compartilha, não malha completa entre todo mundo). Só STUN público (Google e Cloudflare) na configuração ICE — sem servidor TURN.
- **Limitação conhecida**: sem TURN, duas pessoas atrás de NAT simétrico/CGNAT (comum em rede 4G/alguns provedores) podem não conseguir estabelecer conexão direta entre si. Na prática, a maioria das redes domésticas com STUN já basta. Se isso virar problema recorrente, a evolução natural é subir um `coturn` no mesmo PC — mas TURN por padrão relay tráfego em UDP, o que não passa pelo túnel HTTP(S) do Cloudflare sem configuração extra; ficou de fora do escopo "essencial".
- **Efeito prático**: acima de ~6-8 espectadores simultâneos por sala, o upload de quem compartilha vira o gargalo (cada espectador consome uma fatia inteira do upload de quem compartilha a tela). Não é um problema pra "assistir com os amigos", mas não escala pra transmissão em massa — e não é esse o objetivo aqui.

---

## ADR 004 - `allowedDevOrigins` liberado pra domínios de túnel
- **Data**: 2026-08-27
- **Contexto**: O Next 16 recusa em dev requisições cujo `Host` não seja `localhost`/IP local, como proteção contra um tipo de ataque de rebinding. Como os amigos entram pelo domínio temporário do Cloudflare Tunnel (`*.trycloudflare.com`), toda requisição chega com esse `Host`.
- **Decisão**: `next.config.ts` libera `*.trycloudflare.com` (Cloudflare Tunnel, ver `README.md`) e `*.loca.lt` (fallback via `localtunnel`, caso o Cloudflare esteja indisponível) em `allowedDevOrigins`.

---

## ADR 005 - Exposição pra fora da rede via Cloudflare Tunnel avulso (`npm run share`)
- **Data**: 2026-08-27
- **Contexto**: O usuário perguntou se um pacote npm resolveria a exposição pra internet sem custo. Existem duas opções sem conta/cartão: o pacote `cloudflared` (baixa o binário oficial da Cloudflare e abre um "quick tunnel" anônimo, sem login) e `localtunnel` (infraestrutura comunitária, menos estável, mostra uma página de aviso pro visitante clicar antes de entrar).
- **Decisão**: `npm run share` (script em `package.json`) sobe o servidor (`npm run dev`) e, em paralelo, `npx cloudflared tunnel --url http://localhost:3000` — que imprime no terminal uma URL pública `https://<algo-aleatório>.trycloudflare.com` a cada execução. Sem cadastro na Cloudflare, sem cartão, sem domínio próprio.
- **Efeito prático**: a URL muda a cada vez que `npm run share` roda — é preciso reenviar o link pros amigos toda sessão nova. Se isso incomodar, a evolução é criar uma conta grátis na Cloudflare e configurar um "Named Tunnel" com subdomínio fixo (não implementado aqui pra manter o setup em zero configuração).

---

## ADR 006 - Socket criado por instância do hook, não um singleton de módulo
- **Data**: 2026-08-27
- **Contexto**: A primeira versão de `src/hooks/use-sala.ts` chamava um `obterSocket()` que guardava a conexão num `let socket` a nível de módulo (`src/lib/socket.ts`), reaproveitado entre montagens. Em dev, isso quebrava de forma silenciosa: o Fast Refresh do Turbopack podia reavaliar esse módulo (recriando o `let socket = null`) enquanto o efeito antigo ainda não tinha rodado sua limpeza, e o cleanup do efeito chamava `socket.disconnect()` incondicionalmente — o resultado, observado na prática, era um "entrar na sala" que nunca recebia o "ack" do servidor (a lista de participantes ficava presa em 0, mesmo a pessoa vendo a si mesma) porque cada nova conexão era abandonada antes do handshake do Socket.IO terminar.
- **Decisão**: `src/lib/socket.ts` agora só exporta `criarSocket()`, uma função de fábrica. `useSala` cria a conexão dentro do próprio `useEffect` (guardada num `useRef`) e a fecha no cleanup desse mesmo efeito — o ciclo de vida do socket fica preso ao ciclo de vida do hook, sem estado de módulo compartilhado pra sobreviver de forma inconsistente a Fast Refresh/Strict Mode.
- **Efeito prático**: qualquer novo código que precise emitir eventos (chat, compartilhar tela) usa `socketRef.current`, nunca um getter global.

---

## ADR 007 - Tema único, sempre escuro, sem alternância
- **Data**: 2026-08-27
- **Contexto**: Usuário pediu explicitamente um visual "escuro, bem premium", referenciando o print de outro app de compartilhamento de tela (fundo quase preto, um único acento saturado nos botões de ação).
- **Decisão**: `src/app/globals.css` define só uma paleta (não existe mais um bloco `:root` claro + `.dark` escuro alternável) — fundo quase preto (`oklch(0.13 0.005 260)`), acento verde saturado só nas ações "ao vivo" (compartilhar/salas ativas), superfícies do navegador themadas manualmente (seleção de texto, scrollbar) porque são o primeiro sinal de que uma tela foi "desenhada" e não só montada com componentes padrão. `<html>` recebe a classe `dark` fixa em `layout.tsx` só pra ligar as variantes com mais contraste que os próprios componentes Shadcn já trazem prontas (`dark:bg-input/30` etc.) — não existe toggle de tema em lugar nenhum.
- **Efeito prático**: Não adicione `next-themes` nem um botão de alternância sem essa decisão ser revisitada — o pedido original foi por um tema único, não por dois temas com um padrão escuro.

---

## ADR 008 - Isolar o áudio do Discord é escolha de superfície de captura, não código
- **Data**: 2026-08-27
- **Contexto**: O grupo usa Discord (app separado) pra conversar por voz enquanto usa o Tela Junto pra compartilhar tela/vídeo. Pediram pra não vazar o áudio do Discord na transmissão, só o áudio do conteúdo (ex: uma aba do YouTube).
- **Decisão**: Não tem como o código escolher isso por conta própria — quem decide é a pessoa, no seletor nativo do navegador que abre ao clicar em "Compartilhar tela": escolher **compartilhar uma aba** captura só o áudio daquela aba (o Discord nunca aparece ali, então nunca vaza); escolher "tela inteira" captura o áudio do sistema todo, Discord incluso. Por isso o app não tenta filtrar áudio por software — em vez disso, expõe essa explicação onde a decisão é tomada (tooltip no botão do topo quando tem espaço, texto sempre visível no estado vazio da tela de vídeo).
- **Decisão técnica complementar**: `getDisplayMedia` pede áudio com `echoCancellation`, `noiseSuppression` e `autoGainControl` desligados (`src/hooks/use-sala.ts`) — esse processamento é pensado pra voz de microfone; aplicado em áudio de vídeo/jogo, ele corta pedaços tratando trilha sonora como ruído.
- **Efeito prático**: Se isso não for suficiente (por exemplo, alguém compartilhar a tela inteira por engano), é comportamento esperado do navegador, não um bug do Tela Junto.

---

## ADR 009 - Link de "Compartilhar sala" usa `usePathname()`, não `window.location.href` puro
- **Data**: 2026-08-27
- **Contexto**: Bug real encontrado durante o desenvolvimento: `CompartilharSalaDialog` calculava o link uma vez, num `useState(() => window.location.href)`. Ao reproduzir o fluxo real (preencher nome na home, cair na sala por navegação client-side do Next), o link gerado apontava pra raiz do site (`/`), não pra sala — só funcionava certo depois de um refresh completo da página. Causa: o componente pode montar num instante em que `window.location.href` ainda não reflete a rota nova (a transição client-side do App Router não garante a ordem entre o commit do componente e a atualização de `location`).
- **Decisão**: `usePathname()` (hook do próprio Next, sempre sincronizado com a rota atual de verdade) fornece o caminho; só a origem (protocolo+host, que não muda durante a sessão) vem de `window.location.origin`, lido uma vez.
- **Efeito prático**: qualquer componente que precise da URL atual pra exibir/copiar deve preferir os hooks de roteamento do Next (`usePathname`, `useSearchParams`) a ler `window.location` direto, exceto pra partes que genuinamente não mudam (origem, host).

---

## ADR 010 - `docker compose up` builda e sobe tudo, imagem final carrega o projeto inteiro
- **Data**: 2026-08-27
- **Contexto**: Usuário quer compartilhar o repositório com os amigos de um jeito que baixar e rodar `docker compose up` já deixe tudo pronto pra usar, sem instalar Node/npm nem configurar nada à mão.
- **Decisão**: `Dockerfile` builda (`next build`) e serve (`tsx server.ts` em modo produção) o app. `docker-compose.yml` sobe esse único serviço `app`, com `TUNNEL=cloudflare` (ver ADR 011) — o próprio túnel gratuito da Cloudflare já vem junto, sem um segundo serviço/container. (Uma versão anterior deste ADR/arquivo tinha um serviço `tunnel` separado usando a imagem oficial `cloudflare/cloudflared`; substituído quando o túnel passou a ser gerenciado de dentro do próprio `server.ts`, ver ADR 011 — motivo: com dois containers, quem hospeda abrindo `localhost` no navegador não tinha como o app saber a URL pública do container `tunnel` vizinho pra devolver no diálogo "Compartilhar sala".)
- **Decisão técnica**: `tsx`, `cross-env` e `cloudflared` (o pacote npm, não só o binário) estão em `dependencies`, não em `devDependencies` — todos rodam em produção também (`npm run start`/Docker), não são só ferramentas de desenvolvimento.
- **Trade-off assumido**: o estágio final do `Dockerfile` copia o projeto inteiro do estágio de build (`COPY --from=builder /app ./`), node_modules com devDependencies incluído — não há um segundo `npm ci --omit=dev` nem uma poda de arquivos. Isso deixa a imagem maior do que precisaria ser, mas elimina qualquer risco de faltar em runtime um arquivo que `server.ts`/`src/server/*` importem por caminho relativo (esses arquivos rodam via `tsx` direto do código-fonte, não saem do `next build`) — pra um projeto hobby que roda no PC de um amigo, simplicidade e "funciona de primeira" pesam mais que o tamanho da imagem.
- **Efeito prático**: pra rodar só na rede local sem túnel, tirar/comentar a variável `TUNNEL: cloudflare` do `docker-compose.yml` antes de subir.

---

## ADR 011 - Qualidade de transmissão configurável + link público que se descobre sozinho
- **Data**: 2026-08-27
- **Contexto 1 (qualidade)**: Usuário reportou a transmissão travando com qualidade ruim mesmo testando localmente entre duas abas do mesmo PC — sinal de gargalo de CPU/encoder, não de rede. Causa raiz: `getDisplayMedia({ video: true })` sem nenhuma restrição deixa o navegador capturar na resolução nativa do monitor sem limite de fps, o que sobrecarrega o encoder e derruba quadros. Pedido explícito: um painel de qualidade (resolução, taxa de quadros, bitrate) igual ao de apps concorrentes, com padrão 1080p/30fps/4 Mbps.
- **Decisão 1**: `src/lib/qualidade-transmissao.ts` centraliza os presets e duas funções — `construirConstraintsVideo` (aplicada em `getDisplayMedia` e em `track.applyConstraints()` pra mudar ao vivo) e `aplicarLimiteBitrate` (usa `RTCRtpSender.setParameters({ encodings: [{ maxBitrate }] })` em cada conexão de saída — bitrate é parâmetro de quem ENVIA, não de quem recebe). Preferência guardada em `useConfigTransmissaoStore` (`src/store/`), em `localStorage` — é característica do PC/conexão, não da sessão de uma sala (diferente do nome de exibição em `usuario-store.ts`, que é por aba). A track de vídeo também recebe `contentHint = "motion"`: prioriza fluidez sobre nitidez por quadro, alinhado com a queixa ("travando", não "borrado").
- **Contexto 2 (link)**: Usuário reportou que o link do diálogo "Compartilhar sala" vinha com `localhost` mesmo rodando `npm run share` — porque quem hospeda a sala normalmente abre `localhost` no PRÓPRIO navegador pra testar/gerenciar, então `usePathname()`/`window.location.origin` (ADR 009) refletem `localhost` de verdade, não a URL do túnel gerada num processo separado (`cloudflared` via `concurrently`, que o app não tinha como enxergar).
- **Decisão 2**: `npm run share` deixou de subir dois processos separados (`concurrently` + script `tunnel`) — `server.ts` agora spawna o `cloudflared` ele mesmo (`child_process.spawn`, só quando `TUNNEL=cloudflare` está no ambiente), lê a URL pública da própria saída do processo e manda pra todo mundo conectado via um evento novo (`link:publico`, também mandado de novo pra cada socket que conectar depois — `io.emit` sozinho só alcançaria quem já estava conectado no instante em que a URL foi descoberta). `CompartilharSalaDialog` prefere esse `linkPublico` (vindo do servidor) sobre a origem do próprio navegador. Efeito colateral bom: o mesmo mecanismo, sem código a mais, resolveu o problema idêntico no Docker (ADR 010) — daí ter deixado de precisar de um serviço `tunnel` separado lá.
- **Efeito prático**: `npm run tunnel` (script separado) foi removido — o túnel é sempre parte do próprio `server.ts`, nunca um processo à parte que o app não vê.

---

## ADR 012 - Diálogos/popovers desmontam o conteúdo ao fechar (não confiam na animação de saída)
- **Data**: 2026-08-27
- **Contexto**: Bug real, achado testando o app depois de rodar por um tempo (não aparecia em testes com reload constante entre cada verificação): fechar o `Dialog` de "Compartilhar sala" pelo X (ou clicando fora) deixava o *overlay* (`fixed inset-0`, cobre a tela toda) preso com opacidade 100% e `pointer-events: auto` — travando qualquer clique no resto do app, apesar do atributo `data-closed` no DOM estar correto (ou seja, o React/base-ui sabiam que devia estar fechado; só a transição visual de saída nunca terminava de verdade). Reproduzido de forma consistente com o `Dialog` do Shadcn/`@base-ui/react`; o `Popover` (usado no painel de qualidade) tem uma versão mais leve do mesmo problema — sem overlay atrás, então não bloqueia clique, mas fica visualmente preso (`pointer-events: none`, mas ainda visível).
- **Decisão**: `Dialog`/`Popover` usados neste projeto são sempre controlados (`open`/`onOpenChange` com `useState` próprio) e o conteúdo (`DialogContent`/`PopoverContent`) só é renderizado condicionalmente (`{aberto && <...Content>}`) — nunca deixado montado esperando a animação de saída da biblioteca terminar sozinha. Sacrifica o fade-out, mas garante que o elemento realmente some do DOM.
- **Efeito prático**: qualquer novo `Dialog`/`Popover`/`AlertDialog` adicionado ao projeto deve seguir esse mesmo padrão (estado controlado + render condicional do conteúdo) até alguém investigar a causa raiz do lado da biblioteca (`@base-ui/react` + os keyframes do `tw-animate-css`) e confirmar que não é mais preciso.

---

## ADR 013 - `suppressHydrationWarning` em `<html>`/`<body>`
- **Data**: 2026-08-27
- **Contexto**: Usuário reportou o erro de "hydration mismatch" do Next/React ao abrir a sala pelo link direto. O próprio stack trace do erro mostrava a causa: atributos `monica-id`/`monica-version` no `<body>`, injetados pela extensão de navegador Monica (uma extensão de IA) antes do React hidratar a página — um caso clássico e documentado na própria mensagem de erro do React ("It can also happen if the client has a browser extension installed which messes with the HTML"). Não é um bug do app: o servidor nunca renderizou esses atributos, uma extensão de terceiros que os adicionou no DOM do navegador antes do React comparar.
- **Decisão**: `suppressHydrationWarning` no `<html>` e no `<body>` (`src/app/layout.tsx`) — instrui o React a não reclamar de diferença de *atributos* nesses dois elementos especificamente. Não silencia mismatches de conteúdo/estrutura em nenhum outro lugar da árvore (o `suppressHydrationWarning` não é recursivo além do próprio elemento) — se aparecer um hydration warning em outro componente, a causa é outra e precisa investigação normal, não esse mesmo atalho.
- **Efeito prático**: continua completamente normal (e recomendado) investigar qualquer hydration warning que aparecer em qualquer outro elemento do app — só `<html>`/`<body>` estão deliberadamente silenciados, exatamente pelo motivo documentado aqui.

---

## ADR 014 - Identidade sempre decidida dentro da sala; convidado numerado pelo servidor
- **Data**: 2026-08-28
- **Contexto**: Quem entrava numa sala por um link direto sem nunca ter passado pela home (sem nome salvo) ficava travado. O usuário pediu uma tela de identificação dentro da própria sala, com duas opções: digitar um nome, ou "Continuar como convidado" — nesse caso numerado ("Convidado 1", "Convidado 2"...).
- **Decisão**: `EscolherNomeSala` (`src/components/sala/`) é mostrada por `SalaClient` sempre que a pessoa ainda não tem nome nem escolheu ser convidado. `sala:entrar` passou a aceitar `nome` vazio como sinal de "atribua um nome de convidado" — só o **servidor** decide o número (`gerarNomeConvidado` em `src/server/rooms.ts`, conta quantos "Convidado N" já existem na sala e soma 1), nunca o cliente: só o servidor tem visão confiável de quem já está na sala no exato momento da entrada. A resposta do `ack` de `sala:entrar` agora devolve o nome final escolhido (`resposta.nome`), usado tanto pra digitado quanto pra convidado.
- **Efeito prático**: `useSala` ganhou um parâmetro `pronto: boolean`, separado de `nome` — a conexão só abre quando a identidade foi decidida (nome digitado OU convidado escolhido), nunca antes.

---

## ADR 015 - Vídeo do YouTube sincronizado ("controle remoto"), só YouTube por enquanto
- **Data**: 2026-08-28
- **Contexto**: Usuário pediu uma função inspirada no "Adicionar vídeo, playlist ou live" de um app concorrente (print de referência mostrando YouTube/Twitch/Kick e "quem pode controlar") — mas só precisava de YouTube: colar um link e a sala inteira assistir junto, sincronizado, como um controle remoto compartilhado.
- **Decisão**: Isso NÃO é compartilhamento de tela — é um player embutido (YouTube IFrame API, gratuita, sem chave de API) cujo estado (tocar/pausar/trocar de vídeo) é retransmitido pelo servidor via Socket.IO pros outros players da sala. `src/lib/youtube.ts` (`extrairYoutube`) faz o parsing da URL (vídeo ou playlist) sem depender de `window`/DOM, então roda tanto no cliente quanto em `server.ts`. O servidor guarda uma `FonteVideo` por sala (`src/server/rooms.ts`) com `adicionadoPor` e `qualquerUmControla` — e é ele quem **decide** se um comando pode passar (`fonte:comando` em `server.ts`), nunca confiando no cliente.
- **Sincronização**: comandos pontuais (`tocar`/`pausar`/`carregar`) mais um "heartbeat" de quem controla a cada 5s (`sincronizar`, com posição e se está tocando) pra corrigir desvio de quem só assiste. Não é sincronia quadro a quadro — pra um "assistir junto" entre amigos, é suficiente; não tentamos replicar o motor de sincronismo de um serviço dedicado.
- **Não implementado**: Twitch e Kick apareciam no print de referência, mas não foram pedidos ("eu só queria pro YouTube mesmo") — `AdicionarFonteDialog` não tem seletor de plataforma, é só YouTube.
- **Efeito prático**: se quem tem controle exclusivo ("só eu") sair da sala, o vídeo é removido pra ninguém ficar preso vendo algo que não pode mais pausar/trocar (tratado no `disconnect` do `server.ts`).

---

## ADR 016 - Nome nunca mais viaja entre rotas por um store compartilhado
- **Data**: 2026-08-28
- **Contexto**: Bug crítico real, não só teórico: o fluxo antigo (digitar nome na home → `definirNome()` → navegar pra `/sala/[codigo]`) ficava preso numa "tela preta infinita" com uma certa frequência. Investigando a fundo: o Next empacota `src/store/usuario-store.ts` numa cópia **por rota** — "/" e "/sala/[codigo]" acabam com duas instâncias **independentes** do mesmo store Zustand, cada uma com sua própria hidratação a partir do `sessionStorage`. Como `definirNome()` na home podia disparar uma escrita no `sessionStorage` ANTES da própria hidratação da home terminar (a escrita carrega o estado inteiro da instância da home, inclusive um `hidratado: false` que ainda não tinha virado `true`), a página da sala podia ler esse instantâneo parcial — nome certo, mas `hidratado` preso em `false` pra sempre, e a sala nunca decidia se devia pedir o nome de novo ou seguir em frente.
- **Decisão**: Duas mudanças complementares. (1) `hidratado` deixou de ser um campo do estado persistido — vira `useUsuarioHidratado()`, um hook baseado em `useSyncExternalStore` sobre a própria API do zustand-persist (`persist.hasHydrated()`/`persist.onFinishHydration()`), que nunca é gravado no `sessionStorage` e portanto não sofre essa corrida. (2) A home (`EntrarForm`) parou de coletar nome — só decide o código da sala e navega; o nome passou a ser decidido **sempre** dentro da própria sala (`EscolherNomeSala`, ADR 014), na mesma árvore de componentes que efetivamente usa esse valor, eliminando de vez o salto entre instâncias de store de rotas diferentes.
- **Efeito prático**: qualquer estado que precise sobreviver de "/" pra "/sala/[codigo]" deve ir pela URL (parâmetro de rota) ou ser decidido de novo dentro da própria página da sala — nunca por um store Zustand módulo-level compartilhado torcendo pra hidratar a tempo. Isso não é exclusivo do Zustand: qualquer módulo com estado no nível do módulo pode sofrer o mesmo empacotamento por rota.

---

## ADR 017 - Deploy opcional no Render (grátis, mas já não é "seu próprio PC")
- **Data**: 2026-08-28
- **Contexto**: Usuário perguntou se dava pra hospedar no Render de graça, em vez de depender do próprio PC estar ligado rodando `npm run share`/Docker. Isso é uma mudança real de arquitetura em relação ao objetivo original do projeto ("usar o processamento do meu computador", ver a memória de preferência do usuário) — o Render ainda é gratuito em dinheiro, mas passa a ser processamento de terceiro, sempre disponível, em troca de abrir mão de "só roda quando eu ligo".
- **Decisão**: `render.yaml` na raiz do repositório declara um Blueprint do Render — um serviço `web` do tipo `runtime: docker`, plano `free`, apontando pro `Dockerfile` que já existia (nenhuma mudança nele foi necessária: `server.ts` já lê `PORT`/`HOST` do ambiente, e o Render injeta o `PORT` dele por cima do `ENV PORT=3000` do Dockerfile). De propósito **sem** `TUNNEL=cloudflare`: o Render já entrega uma URL pública própria (`https://<nome>.onrender.com`), então o túnel do Cloudflare (ADR 011) seria redundante — o diálogo "Compartilhar sala" já cai de volta pra `window.location.origin` quando não existe `linkPublico`, então funciona certo ali sem nenhuma mudança de código.
- **Limitações do plano grátis do Render** (verificadas na documentação oficial e em fontes de terceiros, agosto/2026): sem cartão de crédito pra começar; 750 horas grátis por mês (dá pra um serviço rodando o mês inteiro); o serviço "dorme" depois de 15 minutos sem tráfego HTTP, com um "cold start" de 30–60s pro próximo acesso acordar ele; WebSocket funciona normalmente (a documentação do Render não impõe timeout fixo, só recomenda keepalive — que o Socket.IO já faz sozinho por padrão, então a sala não deve cair sozinha enquanto tiver gente usando).
- **Efeito prático**: como o vídeo em si trafega P2P (WebRTC, nunca passa pelo servidor), o Render só serve as páginas e retransmite mensagens pequenas de sinalização/chat — não deve chegar perto de nenhum limite de banda do plano grátis. O usuário decide, ciente do trade-off, se quer manter o fluxo 100% no próprio PC (ADR 005/010/011) ou usar o Render pra não depender do PC estar ligado.

---

## ADR 018 - Produto renomeado pra "Sinal" (repositório continua "antijanja")
- **Data**: 2026-08-28
- **Contexto**: Em paralelo ao trabalho desta sessão, uma redesign visual completa (skill `impeccable`, rodada numa sessão separada do Claude Code sobre o mesmo repositório — ver `docs/handoffs.md`) trocou o tema visual e, junto, o nome do produto de "Tela Junto" pra "Sinal" (ver `DESIGN.md`, seed `22df9449`). O usuário confirmou explicitamente: quer manter esse nome novo em todo lugar visível — **exceto** o nome do repositório no GitHub, que continua `antijanja` (já em uso, com histórico, link compartilhado com o Render etc. — trocar geraria mais confusão do que resolveria).
- **Decisão**: "Sinal" é o nome do produto daqui pra frente — usado em `README.md`, `AGENTS.md`, `PRODUCT.md`, título de `docs/decisions.md`, `package.json` (`name: "sinal"`), `render.yaml` (serviço `sinal`, URL `sinal-xxxx.onrender.com`) e em toda a interface (já feito pela sessão de redesign: `<title>`, home, header da sala). "antijanja" continua sendo só o nome do repositório Git — não aparece em lugar nenhum da interface nem da documentação como nome do produto.
- **Fora do escopo desta mudança**: chaves internas de `sessionStorage`/`localStorage` (`tela-junto:usuario`, `tela-junto:config-transmissao` em `src/store/`) continuam com o prefixo antigo — são identificadores internos invisíveis ao usuário, sem necessidade prática de migrar; trocar geraria só reset de preferências salvas sem nenhum ganho visível.
- **Efeito prático**: qualquer documentação ou código novo deve usar "Sinal" como nome do produto. Menções antigas a "Tela Junto" dentro do *corpo* de ADRs anteriores a este (ex: ADR 008) não foram reescritas — são registro histórico de decisões tomadas quando o projeto ainda tinha esse nome, e um ADR não se reescreve retroativamente.

---

## ADR 019 - Compartilhamento de tela chegava tipo 160p/360p pra quem assistia
- **Data**: 2026-08-28
- **Contexto**: Usuário reportou, tanto rodando local quanto no Render, que quem assiste a tela compartilhada recebe uma qualidade bem baixa (aparência de 160p/360p) mesmo com o preset em 1080p/4 Mbps (ADR 011). Causa raiz: a ADR 011 setava `trilhaVideo.contentHint = "motion"` pra resolver travamento por excesso de captura sem limite — mas `contentHint = "motion"` também é o sinal que o navegador usa pra escolher `degradationPreference: "maintain-framerate"` por padrão. Ou seja: assim que a estimativa de banda do WebRTC (GCC) cai abaixo do bitrate escolhido — upload de casa mais fraco, rota adicional via túnel/Render, rede do amigo que está assistindo — o encoder tem ordem explícita de sacrificar **resolução** pra manter os quadros por segundo, o que na prática produz exatamente o sintoma relatado.
- **Decisão**: Duas mudanças complementares, uma para não sacrificar mais resolução, mesma lógica em dois lugares pra não depender só do comportamento implícito de um navegador: (1) `trilhaVideo.contentHint` trocado de `"motion"` pra `"detail"` — sinaliza a preferência oposta; (2) `aplicarLimiteBitrate()` (`src/lib/qualidade-transmissao.ts`) agora também seta `parametros.degradationPreference = "maintain-resolution"` explicitamente no `RTCRtpSender`, não dependendo só do `contentHint` (nem todo navegador infere esse padrão do mesmo jeito).
- **Trade-off consciente**: sob aperto real de banda, agora é o fps que cai (ex: 1080p a 15fps em vez de 1080p a 30fps) em vez da resolução — para compartilhamento de tela (texto, código, planilha, UI) isso é a troca certa: conteúdo legível importa mais que suavidade de movimento. Isso não desfaz a ADR 011: os limites de resolução/fps/bitrate por preset continuam sendo o que evita a captura sem limite nenhum que causava o travamento original.
- **Efeito prático**: quem assiste deve ver a resolução escolhida no preset (1080p por padrão) se mantendo estável mesmo em rede mais fraca, com o fps variando em vez disso. Continua sem TURN (só STUN, ADR 003) — em redes com NAT muito restritivo a conexão P2P direta ainda pode falhar por completo, isso é um problema diferente (não coberto por esta ADR).

---

## ADR 020 - Reconexão automática: reentrar na sala a cada `connect` do socket
- **Data**: 2026-09-25
- **Contexto**: Usuário reportou que, no celular, ao sair do app/bloquear a tela e voltar, a tela compartilhada congelava e só voltava saindo e entrando na sala de novo. Causa raiz: o `useSala` só emitia `sala:entrar` uma vez. Quando o celular suspende a aba ou a rede oscila, o Socket.IO cai e reconecta sozinho — mas o servidor trata a queda como saída (`disconnect` → remove da sala) e o novo socket chega sem estar em sala nenhuma; as `RTCPeerConnection` antigas também já tinham morrido. Resultado: socket "conectado", fora da sala, com vídeo congelado.
- **Decisão**: (1) `sala:entrar` passou a ser emitido dentro de um handler do evento `connect` do socket (dispara na primeira conexão e em toda reconexão), que antes fecha as conexões WebRTC antigas e limpa os streams remotos; (2) o nome efetivo devolvido pelo servidor é reaproveitado na reentrada, pra convidado não virar "Convidado N" novo a cada queda; (3) se a pessoa estava compartilhando a tela, reanuncia `compartilhar:iniciar` e reabre uma oferta de saída pra cada participante; (4) ao voltar pro app (`visibilitychange`) força `socket.connect()` se estiver desconectado, e `VideoTile` chama `video.play()` porque o celular pausa o `<video>` em segundo plano.
- **Efeito prático**: o id do participante muda a cada reconexão (o servidor vê um socket novo) — nenhum código deve guardar `euId` esperando que seja estável entre quedas. Testado derrubando e subindo o servidor com um transmissor e um espectador conectados: ambos reentram sozinhos e o vídeo volta.

---

## ADR 021 - Layout de celular: vídeo fixo no topo, abas Chat/Participantes
- **Data**: 2026-09-25
- **Contexto**: No celular a sala era uma página comprida (vídeo, participantes, chat empilhados): o chat ficava abaixo da dobra, o vídeo saía da tela ao rolar pra ler mensagens, e o teclado empurrava tudo. A tela também apagava no meio da transmissão, e a queda de rede não dava nenhum sinal na interface.
- **Decisão**: Abaixo de `md` a sala vira uma coluna que **não rola a página**: vídeo no topo (`max-h-[50dvh]`), uma barra de abas **Chat** (com contador de não lidas) / **Participantes**, e o painel da aba ativa ocupando o resto — o vídeo fica sempre visível e só o painel rola. Do `md` pra cima continua a grade de três colunas. Complementos: tela cheia trava em paisagem no toque (`screen.orientation.lock`, só onde o navegador deixa) e destrava ao sair; duplo toque no vídeo alterna tela cheia; `useWakeLock` mantém a tela acesa enquanto há transmissão/vídeo (e pede de novo ao voltar pro app); faixa "Reconectando…" ligada ao estado do socket e aos eventos `offline`/`online` do navegador (o Socket.IO só percebe a queda no próximo ping).
- **Efeito prático**: as abas escondem o painel inativo com `display: none`, e o navegador restaura a posição de rolagem ao reaparecer disparando um evento de rolagem — o `Chat` ignora rolagens que chegam junto com mudança de altura (`alturaRef`) e usa `ResizeObserver` pra voltar ao fim; sem isso ele achava que a pessoa estava lendo o histórico e deixava as mensagens novas escondidas. O contador de não lidas é derivado (`vistas` só muda ao sair do chat), sem efeito.

---

## ADR 022 - Melhorias de desktop: cinema, destaque, volume, atalhos, avisos
- **Data**: 2026-09-25
- **Contexto**: No PC o vídeo ficava preso à coluna central (tela cheia era o único jeito de ver grande), não havia controle de volume por transmissão, nada avisava quem estava em outra janela (Discord, jogo) e, com 2 transmissões, as duas ficavam do mesmo tamanho.
- **Decisão**: (1) **Modo cinema** (`C` ou botão do cabeçalho) esconde a lista de participantes. (2) **Destaque**: com 2+ telas, um botão em cada uma amplia a escolhida e as outras viram miniaturas (clicar numa miniatura a destaca). As telas continuam filhas diretas do mesmo grid — só muda a classe CSS; trocar de pai remontaria o player do YouTube e perderia a sincronia (ADR 015). (3) **Volume/mudo por tela** só do lado de quem assiste (slider + `M`), escondido no toque (o celular tem o botão do aparelho). (4) **Estatísticas de recepção** (`1080p · 30 fps · 3,2 Mbps`) a cada 2s via `getStats()` da conexão de entrada (`lerEstatisticasEntrada` em `useSala`); o bitrate é a diferença de bytes entre duas leituras. Serve pra separar rede fraca de configuração de quem transmite (ADR 019). (5) **Chat sobreposto em tela cheia**: o bloco em tela cheia é o `container` do `VideoTile`, então o chat vive dentro dele (painel sólido `bg-popover`, como os outros overlays do DESIGN.md), aberto por botão ou `/`. (6) **Atalhos** `F` tela cheia, `M` mudo, `/` chat, `C` cinema — ignorados enquanto se digita ou com diálogo aberto; a sala manda eventos DOM (`sinal:*`) pro tile em vez de tocar no estado dele. (7) **Avisos**: `useAvisos` põe "(n) Sinal" no título e toca um bipe (WebAudio, sem arquivo) só com a aba escondida, ao chegar mensagem de outra pessoa ou alguém começar a transmitir; o som liga/desliga no cabeçalho e fica no `localStorage`. (8) Botão de copiar link no cabeçalho, sem abrir o diálogo (`useLinkSala`/`useCopiar` compartilhados com ele).
- **Efeito prático**: o título da aba é lido na hora do aviso (tirando o prefixo "(n) "), nunca guardado no mount — numa navegação do Next o `<title>` pode estar vazio nesse instante. O `alternarTelaCheia` vive em `src/lib/tela-cheia.ts` porque é acionado tanto pelo botão quanto por atalho.
