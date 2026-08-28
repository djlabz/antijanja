# Registro de Decisões de Arquitetura (ADR) - Tela Junto

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

## ADR 010 - `docker compose up` sobe app + túnel, imagem final carrega o projeto inteiro
- **Data**: 2026-08-27
- **Contexto**: Usuário quer compartilhar o repositório com os amigos de um jeito que baixar e rodar `docker compose up` já deixe tudo pronto pra usar, sem instalar Node/npm nem configurar nada à mão.
- **Decisão**: `docker-compose.yml` sobe dois serviços — `app` (build local via `Dockerfile`, `next build` + `tsx server.ts` em modo produção) e `tunnel` (imagem oficial `cloudflare/cloudflared`, mesmo "quick tunnel" gratuito do `npm run share`/ADR 005, apontando pra `http://app:3000` pela rede interna do Compose). O link público aparece nos logs do serviço `tunnel`.
- **Decisão técnica**: `tsx` e `cross-env` foram movidos de `devDependencies` pra `dependencies` no `package.json` — deixaram de ser só ferramentas de desenvolvimento no momento em que `server.ts` passou a rodar via `tsx` também em produção (`npm run start`).
- **Trade-off assumido**: o estágio final do `Dockerfile` copia o projeto inteiro do estágio de build (`COPY --from=builder /app ./`), node_modules com devDependencies incluído — não há um segundo `npm ci --omit=dev` nem uma poda de arquivos. Isso deixa a imagem maior do que precisaria ser, mas elimina qualquer risco de faltar em runtime um arquivo que `server.ts`/`src/server/*` importem por caminho relativo (esses arquivos rodam via `tsx` direto do código-fonte, não saem do `next build`) — pra um projeto hobby que roda no PC de um amigo, simplicidade e "funciona de primeira" pesam mais que o tamanho da imagem.
- **Efeito prático**: `docker compose up app` (só esse serviço) roda sem o túnel, só acessível na rede local — útil pra quem só quer testar ou já tem outra forma de expor a porta 3000.
