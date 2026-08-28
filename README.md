# Tela Junto

Compartilhe sua tela com os amigos numa sala, sem cadastro — inspirado no
[GoLive](https://golive.nemtudo.me), mas rodando de graça direto do seu
computador (sem servidor pago, sem banco de dados). Veja `docs/decisions.md`
pra entender as trocas feitas pra isso funcionar sem custo.

## Rodar com Docker (mais fácil — não precisa instalar Node)

Precisa só do [Docker Desktop](https://www.docker.com/products/docker-desktop/)
instalado.

```bash
git clone https://github.com/djlabz/antijanja.git
cd antijanja
docker compose up
```

Isso sobe **dois** serviços: o app (`http://localhost:3000`, pra quem tá na
mesma rede) e um túnel grátis da Cloudflare (pra quem tá fora). O link
público aparece nos logs — se não aparecer na tela de primeira, roda:

```bash
docker compose logs tunnel
```

Procure uma linha assim e manda esse link pros amigos:

```
your quick tunnel has been created! visit it at:
https://algo-aleatorio-tipo-isso.trycloudflare.com
```

`docker compose down` derruba tudo. Se só quiser usar na rede local, sem
expor pra internet: `docker compose up app` (sem o serviço do túnel).

> A URL do túnel muda toda vez que a stack sobe de novo — proposital (ver
> ADR 005/010 em `docs/decisions.md`), o objetivo era zero configuração, não
> link fixo.

## Rodar sem Docker (desenvolvimento)

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Pra convidar os amigos de fora da sua rede sem Docker:

```bash
npm run share
```

Isso sobe o servidor **e** abre o mesmo túnel do Cloudflare ao mesmo tempo,
via terminal.

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

- `docker compose up` — app + túnel público, tudo num comando só (recomendado).
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
