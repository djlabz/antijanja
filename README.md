# Sinal

Compartilhe sua tela com os amigos numa sala, sem cadastro — inspirado no
[GoLive](https://golive.nemtudo.me), mas rodando de graça direto do seu
computador (sem servidor pago, sem banco de dados). Veja `docs/decisions.md`
pra entender as trocas feitas pra isso funcionar sem custo.

> O repositório no GitHub chama `antijanja` (nome do repo, não muda) — o
> produto em si chama **Sinal** (era "Tela Junto" antes do redesign, ver
> ADR 018).

## Rodar com Docker (mais fácil — não precisa instalar Node)

Precisa só do [Docker Desktop](https://www.docker.com/products/docker-desktop/)
instalado.

```bash
git clone https://github.com/djlabz/antijanja.git
cd antijanja
docker compose up
```

Isso já sobe o app **com** um túnel grátis da Cloudflare — o link público
aparece direto nos logs. Se não aparecer na tela na hora, roda:

```bash
docker compose logs app | grep trycloudflare
```

Procure uma linha assim e manda esse link pros amigos:

```
> Link público (compartilhe com os amigos): https://algo-aleatorio-tipo-isso.trycloudflare.com
```

Ou simplesmente clique em "Compartilhar sala" dentro do app — o link que
aparece lá **já vem pronto com esse endereço**, mesmo se você mesmo abrir
`http://localhost:3000` no seu navegador pra usar.

`docker compose down` derruba tudo. Se só quiser usar na rede local, sem
expor pra internet: apague/comente a linha `TUNNEL: cloudflare` do
`docker-compose.yml` antes de subir.

> A URL do túnel muda toda vez que a stack sobe de novo — proposital (ver
> ADR 005/010/011 em `docs/decisions.md`), o objetivo era zero configuração,
> não link fixo.

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

Isso sobe o servidor **e** o mesmo túnel do Cloudflare junto, no mesmo
processo — o link do "Compartilhar sala" já sai pronto, mesmo se você
mesmo estiver em `localhost`.

## Deploy no Render (grátis, sem depender do seu PC ligado)

Alternativa ao Docker/`npm run share`: hospedar de graça no
[Render](https://render.com), pra sala ficar disponível o tempo todo, sem
precisar do seu computador ligado. Ainda é gratuito em dinheiro, mas é
processamento de terceiro — não é mais "seu próprio PC" (ver ADR 017 em
`docs/decisions.md`). Nada no código muda: o repositório já tem um
`render.yaml`, o mesmo `Dockerfile` do Docker Compose funciona lá direto.

1. Faça login em [render.com](https://render.com) (não pede cartão pro plano free).
2. **New +** → **Blueprint**.
3. Conecte sua conta do GitHub (se ainda não tiver conectado) e escolha o
   repositório `djlabz/antijanja`.
4. O Render lê o `render.yaml` sozinho e já mostra o serviço `sinal`
   configurado (Docker, plano Free). Clique em **Apply**.
5. Espera o primeiro build terminar (uns minutos) — o Render te dá uma URL
   tipo `https://sinal-xxxx.onrender.com`. É só isso, já dá pra
   compartilhar esse link com os amigos.

Não precisa configurar nenhuma variável de ambiente a mais — não ligue
`TUNNEL=cloudflare` aqui, o Render já é público por conta própria.

> **Limitação do plano grátis**: o serviço "dorme" depois de 15 minutos sem
> acesso, e o próximo clique demora uns 30–60s pra acordar ele (o resto do
> tempo, funciona normal). Detalhes em `docs/decisions.md` (ADR 017).

## Como funciona (resumo)

- Cada sala é só um código (tipo `wsrpx`) que quem quer que existam
  simultaneamente compartilha entre si — não tem conta, não tem senha.
- A tela sai direto do PC de quem compartilha pro PC de quem assiste
  (WebRTC ponto a ponto) — o seu computador só serve de "central telefônica"
  pra combinar quem fala com quem (Socket.IO), o vídeo em si não passa por
  ele além do próprio compartilhamento.
- Nada fica salvo: fechar o servidor apaga todas as salas.
- Clique no ícone de engrenagem pra escolher resolução, taxa de quadros e
  bitrate máximo da sua transmissão (padrão: 1080p, 30fps, 4 Mbps) — vale a
  pena baixar se a transmissão travar, principalmente em upload mais fraco.
- Quem entra pelo link sem nome salvo escolhe um nome ou entra como
  "Convidado N" — sem cadastro, sempre dentro da própria sala.
- "Adicionar vídeo" cola um link do YouTube (vídeo ou playlist) e todo
  mundo na sala assiste junto, sincronizado — como um controle remoto
  compartilhado. Só YouTube por enquanto.

Detalhes técnicos e por quê de cada escolha: `docs/decisions.md`.
Escopo da funcionalidade: `docs/features/000-sala-compartilhamento-tela.md`.

## Atalhos e recursos da sala
Dentro da sala (no PC): `F` tela cheia · `M` mudo · `C` modo cinema · `P`
janela flutuante (PiP) · `/` chat. Tem reações rápidas que flutuam sobre o
vídeo, destaque de tela quando há mais de uma transmissão e aviso no título
da aba quando chega mensagem. No celular o vídeo fica fixo no topo com abas
Chat/Participantes. Detalhes em `docs/features/001-uso-no-celular-e-desktop.md`.

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
  compartilha vira o gargalo — cada espectador a mais consome mais uma
  fatia inteira do seu upload (ADR 003). Baixar a qualidade no ícone de
  engrenagem ajuda, mas não substitui ter upload suficiente pra sala.
- Sem lista de salas públicas, sem conta, sem histórico entre sessões —
  de propósito, pra manter o projeto em zero custo e zero configuração
  (escopo combinado no início do projeto, ver `docs/tasks.md`).
