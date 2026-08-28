# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grupos pequenos de amigos (tipicamente 2-8 pessoas) que querem compartilhar
tela juntos — assistir algo, jogar, ou só bater papo mostrando a tela — de
forma casual e informal, sem burocracia de conta ou login. Quem hospeda a
sessão é um dos próprios amigos, rodando o servidor no PC dele.

## Product Purpose

Compartilhamento de tela em grupo ao estilo GoLive, mas rodando de graça no
computador de quem hospeda a sessão — sem servidor pago, sem banco de dados,
sem contas. Sucesso é: qualquer um do grupo entra numa sala com só um nome e
um código, compartilha a tela pros outros, e a experiência funciona sem
fricção nem custo pra ninguém.

## Positioning

Alternativa gratuita e auto-hospedada ao GoLive: mesma proposta (sala com
código, compartilhamento de tela em grupo, sem cadastro), mas sem dependência
de um servidor pago de terceiros — quem quiser usar sobe o próprio servidor
(com ou sem Docker) e compartilha o link com os amigos.

## Operating Context

- Sessões informais e curtas entre amigos: assistir vídeo/jogo junto,
  compartilhar tela pra ajudar alguém, etc.
- Quem hospeda entra num compromisso implícito: o servidor só existe enquanto
  o PC dele estiver rodando; fechar a sessão apaga a sala.
- Uso em redes domésticas variadas — upload de quem compartilha é o gargalo
  prático (ver limitações no README).
- Sem lista de salas públicas: a sala só existe pra quem recebeu o
  código/link.

## Capabilities and Constraints

- Entrar numa sala com nome + código (cria sala nova se o código não
  existir).
- Compartilhar tela (com áudio do sistema, se o navegador suportar) via
  WebRTC P2P; o servidor só faz sinalização (Socket.IO), não vê o vídeo.
- Ver participantes da sala e quem está compartilhando no momento.
- Chat de texto por sala.
- Ajustar qualidade da transmissão (resolução/fps/bitrate) por quem
  compartilha.
- Compartilhar link da sala (com túnel público opcional via Cloudflare).
- Sem contas, sem senha, sem persistência entre reinícios do servidor
  (decisão de arquitetura, ver ADR 001).
- Sem servidor TURN: conexão P2P pode falhar em redes muito restritivas
  (ADR 003).
- Acima de ~6-8 espectadores simultâneos, o upload de quem compartilha vira
  gargalo.
- Sem webcam/microfone dos participantes — só a tela compartilhada, por
  enquanto.

## Brand Commitments

- Nome do produto: **Sinal** (era "Tela Junto" — renomeado, decisão travada,
  ver ADR 018 em `docs/decisions.md`). O repositório no GitHub continua se
  chamando `antijanja` — nome do repo, não do produto, não muda.
- Restrição visual explícita, vinda diretamente do usuário (não inferida): a
  identidade visual deve manter uma base preta/escura, mesmo que o resto
  (paleta de apoio, tipografia, personalidade) fique mais ousado.

## Evidence on Hand

Nenhuma evidência externa (depoimentos, dados de uso, imprensa) disponível —
não inventar nada disso em trabalho futuro. A única referência de produto
citada é o GoLive (golive.nemtudo.me), usada como ponto de comparação de
proposta, não como fonte de assets ou conteúdo a copiar.

## Product Principles

- Custo zero e sem servidor de terceiros: qualquer decisão de produto/infra
  deve continuar rodando de graça no PC de quem hospeda.
- Zero fricção de entrada: nome + código, sem cadastro, sem senha — não
  adicionar atrito de conta em nome de robustez.
- Efêmero por design: nada precisa sobreviver a um restart do servidor; não
  é bug, é a proposta.
- Grupo pequeno e informal antes de escala: otimizar pra 2-8 amigos numa
  sessão casual, não pra audiências grandes ou uso corporativo.
- Transparência técnica sobre limitações: o projeto documenta abertamente
  onde ele quebra (upload, TURN, tamanho de grupo) em vez de esconder.

## Accessibility & Inclusion

Padrão de mercado: contraste adequado, navegação por teclado, e suporte
básico a leitor de tela — sem exigência formal além disso (confirmado com o
usuário).
