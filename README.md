# Tela Junto

Compartilhe sua tela com os amigos numa sala, sem cadastro — inspirado no
[GoLive](https://golive.nemtudo.me), mas rodando de graça direto do seu
computador (sem servidor pago, sem banco de dados). Veja `docs/decisions.md`
pra entender as trocas feitas pra isso funcionar sem custo.

## Rodar só pra você (mesma rede)

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Jogar/assistir com os amigos (fora da sua rede)

```bash
npm run share
```

Isso sobe o servidor **e** abre um túnel grátis da Cloudflare
(`cloudflared`, sem precisa de conta) ao mesmo tempo. Depois de alguns
segundos aparece no terminal uma linha assim:

```
your quick tunnel has been created! visit it at:
https://algo-aleatorio-tipo-isso.trycloudflare.com
```

Manda esse link pros amigos. Enquanto o comando estiver rodando no seu PC,
a sala fica acessível pra quem tiver o link — feche o terminal (`Ctrl+C`)
quando terminar a sessão.

> A URL muda toda vez que você roda `npm run share` de novo. Isso é
> proposital (ver ADR 005 em `docs/decisions.md`) — o objetivo era zero
> configuração, não link fixo.

## Como funciona (resumo)

- Cada sala é só um código (tipo `wsrpx`) que quem quer que existam
  simultaneamente compartilha entre si — não tem conta, não tem senha.
- A tela sai direto do PC de quem compartilha pro PC de quem assiste
  (WebRTC ponto a ponto) — o seu computador só serve de "central telefônica"
  pra combinar quem fala com quem (Socket.IO), o vídeo em si não passa por
  ele além do próprio compartilhamento.
- Nada fica salvo: fechar o servidor apaga todas as salas.

Detalhes técnicos e por quê de cada escolha: `docs/decisions.md`.
Escopo da funcionalidade: `docs/features/000-sala-compartilhamento-tela.md`.

## Comandos

- `npm run dev` — sobe o servidor (Next.js + Socket.IO) só na sua rede local.
- `npm run share` — sobe o servidor + túnel público pros amigos de fora.
- `npm run lint` — checa o código.
- `npm run build` / `npm run start` — build de produção.

## Limitações conhecidas

- Sem servidor TURN: em redes muito restritivas (algumas 4G/CGNAT), a
  conexão direta entre dois participantes pode falhar (ADR 003).
- Acima de ~6-8 pessoas assistindo a mesma tela, o upload de quem
  compartilha vira o gargalo — não é feito pra transmissão em massa.
- Sem lista de salas públicas, sem conta, sem histórico entre sessões —
  de propósito, pra manter o projeto em zero custo e zero configuração
  (escopo combinado no início do projeto, ver `docs/tasks.md`).
