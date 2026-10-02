# Sinal

Compartilhamento de tela em grupo (estilo GoLive), rodando de graça no PC de
quem hospeda a sessão. Sem servidor pago, sem banco de dados, sem contas.

O repositório GitHub chama `antijanja` (nome do repo, não muda); o produto
chama Sinal — era "Tela Junto" antes do redesign visual (ADR 018 em
`docs/decisions.md`). Não confunda os dois nomes em código/docs novos.

## Stack

- TypeScript (strict) · Next.js 16 (App Router + Turbopack) · React 19
- Tailwind CSS v4 · Lucide React (ícones) · Shadcn UI
- Socket.IO (sinalização WebRTC) num servidor customizado (`server.ts`)
- Zustand (estado global do cliente)
- WebRTC nativo (`RTCPeerConnection`), sem biblioteca de terceiros

## Como rodar

- Docker (recomendado pra quem só quer usar): `docker compose up` — sobe o
  app + túnel público num comando só (ver `README.md`, ADR 010).
- Instalar (sem Docker): `npm install`
- Dev (só você, na sua rede): `npm run dev`
- Dev + link público pros amigos: `npm run share` (ver `README.md`)
- Lint: `npm run lint` — sempre rode antes de finalizar tarefa
- Build de produção: `npm run build` · servir build: `npm run start`

## Estrutura

- `server.ts` → servidor HTTP customizado: Next.js + Socket.IO na mesma porta (ver `docs/decisions.md`, ADR 002).
- `src/server/rooms.ts` → estado das salas, só em memória (sem banco de dados). Cada participante guarda a `sessao` da aba (nunca sai do servidor).
- `src/server/sinalizacao.ts` → todos os handlers Socket.IO (`registrarSinalizacao(io)`). Todo payload entra como `unknown` e é validado; cada handler roda em `seguro()`. Nunca desestruture o payload direto na assinatura (foi o que derrubava o processo, ADR 025).
- `tests/` → testes de integração do servidor (`npm test`, Node `--test` + `tsx`); suba só o Socket.IO, sem Next.
- `src/lib/conexoes-webrtc.ts` → as `RTCPeerConnection` da sala (abrir, fila de sinais, ICE restart, estado por conexão), sem React; `use-sala.ts` só liga isso ao socket.
- `src/lib/socket-events.ts` → contrato de eventos Socket.IO compartilhado entre cliente e servidor (import relativo nos dois lados, sem depender do alias `@/`).
- `src/hooks/use-sala.ts` → toda a lógica de uma sala: sinalização + WebRTC mesh.
- `src/components/sala/` → UI da sala (vídeo, lista de participantes, chat).
- `src/store/` → Zustand: nome de exibição (`sessionStorage`, por aba — decidido só dentro da sala, ver ADR 016) e qualidade de transmissão preferida (`localStorage`, por dispositivo — ver ADR 011).
- `src/lib/qualidade-transmissao.ts` → presets de resolução/fps e as funções que aplicam isso na captura (`getDisplayMedia`) e no bitrate de cada conexão de saída (`RTCRtpSender.setParameters`).
- `src/components/sala/escolher-nome-sala.tsx` → tela de identificação (nome ou convidado) mostrada dentro da sala quando ainda não tem nome (ADR 014).
- `src/lib/youtube.ts` → parsing de URL do YouTube (vídeo/playlist), sem `window`/DOM — importado tanto do cliente quanto de `server.ts`, igual `socket-events.ts`.
- `src/components/sala/youtube-player.tsx` + `adicionar-fonte-dialog.tsx` → vídeo do YouTube sincronizado pra sala inteira (ADR 015).
- `src/hooks/use-wake-lock.ts`, `use-avisos.ts`, `use-link-sala.ts` → tela acesa, aviso no título/bipe, link da sala + copiar + compartilhar nativo.
- `src/lib/tela-cheia.ts` → entrar/sair da tela cheia (botão e atalho `F` usam a mesma função).
- `src/components/sala/video-tile.tsx` → vídeo com volume, estatísticas, PiP, destaque, chat sobreposto e controles que somem em tela cheia. Recebe atalhos como eventos DOM `sinal:*` (a sala não mexe no estado dele).
- `docs/features/` → especificação de cada funcionalidade (`NNN-nome.md`, prefixo sequencial, nunca reordene os já existentes).
- `docs/decisions.md` → ADRs — por que cada decisão de arquitetura foi tomada.
- `docs/tasks.md` → backlog.
- `docs/handoffs.md` → log de handoffs entre sessões de trabalho.

## Convenções

*(Copiadas do projeto PaceOS — ver `docs/handoffs.md` pra o que foi
deliberadamente deixado de fora.)*

- Importe sempre com o alias `@/` (aponta para `src/`) — **exceto** em
  `server.ts` e `src/server/*`, que rodam fora do bundler do Next e usam
  import relativo (ver ADR 002 em `docs/decisions.md`).
- Componentes React em PascalCase; hooks começam com `use`.
- Textos de UI sempre em Português (PT-BR).
- Páginas do App Router (`src/app/**/page.tsx`) são Server Components;
  lógica interativa fica em Client Components dedicados (`"use client"`).
- Nunca crie Route Handlers (`app/api/`) pra CRUD simples — mas sinalização
  em tempo real É a exceção documentada (ADR 002), não um precedente geral.
- `src/lib/socket-events.ts` não pode importar nada além de tipos puros —
  precisa continuar seguro de importar tanto do lado do Next quanto do
  `server.ts`.

## Nunca faça

- Nunca adicione um banco de dados ou uma conta de usuário "de passagem" —
  isso é uma decisão de arquitetura (ADR 001) que exige revisão, não um
  detalhe de implementação.
- Nunca crie um singleton de módulo pra guardar a conexão Socket.IO do
  cliente — foi tentado, quebrou com Fast Refresh (ADR 006). O socket vive
  dentro do `useEffect` que o usa.
- Nunca renderize tags `<script>` manualmente em Client Components (React 19 bloqueia).
- Nunca deixe um `Dialog`/`Popover`/`AlertDialog` (Shadcn/`@base-ui/react`)
  incontrolado nem confie na animação de saída dele pra sumir da tela —
  bug real, o conteúdo (e o overlay, no caso do Dialog) fica preso visível
  na tela mesmo com `data-closed` correto no DOM. Sempre `open`/`onOpenChange`
  com estado próprio + `{aberto && <...Content>}` (ADR 012).
- Nunca volte a coletar o nome de exibição na home (`EntrarForm`) — isso já
  causou uma condição de corrida real entre duas instâncias do
  `usuario-store` (uma por rota, ver ADR 016). O nome é decidido só dentro
  da própria sala (`EscolherNomeSala`, ADR 014).
- Nunca guarde um "já hidratei" como campo do estado persistido de um store
  Zustand — vira parte do JSON salvo e sofre a mesma corrida do ADR 016. Use
  `persist.hasHydrated()`/`persist.onFinishHydration()` (via
  `useSyncExternalStore`, ver `useUsuarioHidratado` em `usuario-store.ts`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
