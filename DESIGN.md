---
name: Tela Junto
description: Compartilhamento de tela em grupo, sem cadastro, num único tema escuro com um único sinal verde de "ao vivo".
colors:
  quase-preto: "oklch(0.13 0.005 260)"
  quase-branco: "oklch(0.96 0.003 260)"
  carvao: "oklch(0.17 0.006 260)"
  carvao-elevado: "oklch(0.19 0.007 260)"
  verde-ao-vivo: "oklch(0.75 0.19 152)"
  verde-ao-vivo-profundo: "oklch(0.16 0.03 152)"
  grafite: "oklch(0.24 0.008 260)"
  cinza-medio: "oklch(0.21 0.007 260)"
  cinza-texto: "oklch(0.64 0.014 260)"
  verde-acento: "oklch(0.27 0.03 152)"
  verde-acento-texto: "oklch(0.92 0.04 152)"
  vermelho-alerta: "oklch(0.62 0.21 25)"
  vermelho-alerta-texto: "oklch(0.97 0.01 25)"
  borda: "oklch(1 0 0 / 9%)"
  campo: "oklch(1 0 0 / 7%)"
  anel-foco: "oklch(0.75 0.19 152 / 55%)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.02em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
  full: "9999px"
spacing:
  xs: "0.375rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.verde-ao-vivo}"
    textColor: "{colors.verde-ao-vivo-profundo}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
  button-primary-hover:
    backgroundColor: "{colors.verde-ao-vivo}"
  button-outline:
    backgroundColor: "{colors.quase-preto}"
    textColor: "{colors.quase-branco}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
  button-destructive:
    backgroundColor: "{colors.vermelho-alerta}"
    textColor: "{colors.vermelho-alerta}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.625rem"
  card:
    backgroundColor: "{colors.carvao}"
    textColor: "{colors.quase-branco}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.quase-branco}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem"
  badge-codigo:
    backgroundColor: "{colors.carvao}"
    textColor: "{colors.cinza-texto}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
---

# Design System: Tela Junto

## Overview

**Creative North Star: "A Luz de Transmissão"**

Tela Junto é a luz "tally" de um estúdio de TV posta dentro de uma sala
escura de amigos: tudo ao redor fica deliberadamente quieto — fundo quase
preto, chrome baixo, bordas quase invisíveis — pra que só uma coisa consiga
chamar atenção sozinha, o verde vivo reservado exclusivamente pra sinalizar
"isto está ao vivo agora" (compartilhando, sala ativa, participante
transmitindo). Não existe alternância clara/escuro: o produto é usado à
noite, olhando pra uma tela, e um segundo tema só diluiria o único sinal que
importa (ver ADR 007 em `docs/decisions.md`).

O acabamento é plano, não elevado: quase nenhuma sombra aparece na sala em
uso — profundidade vem de camadas de opacidade (painéis em `bg-card/40`,
`bg-card/60` sobre o fundo quase preto), não de `box-shadow`. A única exceção
proposital é o cartão de entrada na home, que ganha uma sombra pesada e
`backdrop-blur` por ser o único objeto de foco antes de alguém entrar na
sala — uma vez dentro, o chrome se aquieta de novo.

Os componentes são discretos e utilitários — botões baixos (28-36px),
bordas sutis, sem decoração — porque a tela compartilhada é a protagonista,
não a interface ao redor dela.

**Key Characteristics:**
- Tema único, sempre escuro — sem alternância clara/escuro.
- Um único acento saturado (verde), reservado só pra sinalizar "ao vivo".
- Superfícies planas com profundidade por opacidade, não por sombra.
- Chrome denso e baixo (botões de 28-36px de altura) que cede espaço ao vídeo.
- Cada participante recebe uma cor de identidade própria, derivada do seu id.

## Colors

Paleta quase monocromática (neutros frios levemente azulados) com um único
acento saturado reservado pra estado "ao vivo"; vermelho existe só pra erro/
ação destrutiva.

### Primary
- **Verde ao Vivo** (`oklch(0.75 0.19 152)`): o único acento saturado do
  sistema. Usado em botões de ação primária ("Compartilhar tela", "Criar
  sala"), no indicador pulsante de "ao vivo" sobre cada vídeo, no ícone de
  quem está compartilhando na lista de participantes, e no glow ambiente
  atrás do cartão de entrada da home. Nunca aparece por decoração.
- **Verde ao Vivo Profundo** (`oklch(0.16 0.03 152)`): texto sobre o verde
  ao vivo (ex: label do botão primário) — quase preto com um leve tingimento
  verde, não preto puro.

### Neutral
- **Quase Preto** (`oklch(0.13 0.005 260)`): fundo da aplicação inteira.
  Deliberadamente quase preto (não cinza-médio) — a cena de uso é uma sala
  escura à noite.
- **Quase Branco** (`oklch(0.96 0.003 260)`): texto principal sobre o fundo.
- **Carvão** (`oklch(0.17 0.006 260)`): superfície de cards e badges — um
  degrau acima do fundo, quase imperceptível.
- **Carvão Elevado** (`oklch(0.19 0.007 260)`): popovers e menus flutuantes
  — mais um degrau acima do carvão.
- **Grafite** (`oklch(0.24 0.008 260)`): botões secundários e superfícies
  "pressionadas".
- **Cinza Médio** (`oklch(0.21 0.007 260)`): superfícies muted (estados
  desabilitados, hover sutil).
- **Cinza Texto** (`oklch(0.64 0.014 260)`): texto secundário/legendas —
  código da sala, timestamps, labels auxiliares.
- **Verde Acento** (`oklch(0.27 0.03 152)`) / **Verde Acento Texto**
  (`oklch(0.92 0.04 152)`): par de superfície/texto pra realces sutis
  ligados ao tema "ao vivo" sem ser o botão de ação principal.
- **Borda** (`oklch(1 0 0 / 9%)`): toda borda do sistema é branco a 9% de
  opacidade sobre o fundo escuro, nunca uma cor neutra sólida — por isso as
  bordas quase desaparecem e o chrome fica quieto.
- **Campo** (`oklch(1 0 0 / 7%)`): fundo de inputs, mesma lógica de branco
  translúcido.
- **Anel de Foco** (`oklch(0.75 0.19 152 / 55%)`): o verde ao vivo também
  cobre o estado de foco de teclado — o único acento faz dupla função.

### Alert (destrutivo, fora do sistema "ao vivo")
- **Vermelho Alerta** (`oklch(0.62 0.21 25)`) / **Vermelho Alerta Texto**
  (`oklch(0.97 0.01 25)`): reservado a "Parar compartilhamento" e mensagens
  de erro — nunca usado pra chamar atenção positiva.

### Named Rules
**The Single Signal Rule.** Existe exatamente um acento saturado no sistema
inteiro — o verde ao vivo — e ele só aparece pra marcar algo que está
ativo agora (compartilhando, ao vivo, foco de teclado). Introduzir uma
segunda cor saturada de uso geral quebra a regra que dá ao verde seu
significado.

**The Translucent Border Rule.** Nenhuma borda usa uma cor neutra sólida;
toda borda é branco semitransparente (`oklch(1 0 0 / 9%)`) sobre o fundo
escuro. É o que mantém o chrome "quieto" — a borda separa sem competir por
atenção.

### Identity color (per-participant, generated — not a fixed token)
Cada participante recebe uma cor própria derivada por hash do seu id de
socket: `oklch(0.6 0.14 <matiz>)`, luminosidade e croma fixos, só o matiz
varia (`src/lib/cor-participante.ts`). Usada no avatar e no nome no chat,
sempre a mesma pro mesmo participante durante a sessão, sem depender de
ordem de entrada. Não é uma paleta fixa de N cores — é uma função geradora;
tratar como token de comportamento, não como swatch fixo.

## Typography

**Display/Body Font:** Geist (com fallback `ui-sans-serif, system-ui, sans-serif`)
**Mono Font:** Geist Mono (com fallback `ui-monospace, monospace`)

**Character:** Sans-serif geométrica neutra e técnica — o mesmo peso pra
título de página e texto de chat, sem uma voz "de marca" separada; a única
variação de personalidade tipográfica é o mono, reservado a códigos de sala
(`wsrpx`) pra sinalizar "isto é um identificador técnico, copie exatamente".

### Hierarchy
- **Display** (600, 1.875rem, tracking -0.02em): título da home ("Tela
  Junto"). Único lugar com esse peso e tamanho — a sala em uso não repete o
  nome do produto em destaque.
- **Title** (500, 1rem, leading 1.375): títulos de card/dialog (ex: "Nome da
  sala", diálogos de compartilhamento).
- **Body** (400, 0.875rem, leading 1.5): texto padrão — mensagens de chat,
  descrições, parágrafos de ajuda.
- **Label** (500, 0.75rem, tracking 0.02em, geralmente uppercase): rótulos
  de seção ("PARTICIPANTES · 3", "CHAT") e labels de campo de formulário.
- **Mono** (400, 0.75rem): código da sala, exibido dentro de um badge —
  nunca corrido em parágrafo.

### Named Rules
**The One Size Up Rule.** Só o título da home usa a escala "display"; todo
resto do produto — inclusive títulos de dialog e cabeçalho da sala — fica no
range title/body. A hierarquia tipográfica é rasa de propósito: o produto
não tem páginas internas que precisem de peso extra.

## Layout

Sala em grid de três colunas fixas em desktop (`220px_1fr_300px`): lista de
participantes à esquerda, vídeo(s) no centro, chat à direita; em telas
estreitas colapsa pra empilhado com o vídeo primeiro (`order-2`/`order-1`
trocado por breakpoint). Densidade compacta: gaps de 0.75rem (`gap-3`),
padding de página de 0.75rem — o layout claramente não é uma landing page,
é uma central de controle que cede o máximo de área possível ao vídeo.

A home foge dessa densidade de propósito: composição centralizada, único
cartão flutuante de largura máxima `max-w-sm`, bastante respiro vertical
(`py-16`) — o único momento do produto que não é "utilitário denso".

## Elevation & Depth

Sistema majoritariamente plano: quase nenhum `box-shadow` no chrome da sala.
Profundidade vem de camadas de opacidade sobre o fundo quase preto — painéis
usam `bg-card/40` ou `bg-card/60` em vez de uma cor sólida mais clara, então
a "elevação" é uma questão de transparência, não de sombra projetada.

A exceção deliberada é o cartão de entrada da home: `shadow-2xl
shadow-black/40` + `backdrop-blur-sm`, porque é o único objeto de foco na
tela antes de alguém entrar numa sala. Ao entrar na sala, nenhum outro
elemento reivindica esse mesmo peso visual.

### Named Rules
**The Flat-In-Room, Lifted-At-Arrival Rule.** Sombra pesada existe em
exatamente um lugar do produto — o cartão de entrada da home. Qualquer outro
componente que "precisar" de elevação deve resolver isso com camadas de
opacidade (`bg-card/NN`) antes de introduzir uma sombra nova.

## Shapes

Escala de raio única, derivada de uma base de `0.625rem`: `sm` (0.375rem,
raro), `md` (0.5rem, controles pequenos), `lg` (0.625rem, botões e inputs),
`xl` (0.875rem, cards/painéis/tiles de vídeo), `2xl` (1.125rem, só o cartão
de entrada da home). Badges, avatares, e o indicador "ao vivo" usam `full`
(pílula/círculo). Nenhum componente usa cantos vivos (0px) — o sistema
inteiro tem alguma suavidade de canto, variando só a intensidade.

## Components

### Buttons
- **Shape:** `rounded-lg` (0.625rem), altura compacta (`h-7`/`h-8`/`h-9` —
  28/32/36px), leve recuo de 1px no `active` (não escala, não sobe).
- **Primary:** fundo verde ao vivo sólido, texto verde-profundo — reservado
  a ações que iniciam algo "ao vivo" (compartilhar, criar sala, enviar).
- **Outline / Secondary / Ghost:** sem preenchimento saturado, só variação de
  fundo neutro no hover — usados pra ações de suporte (voltar, configurar).
- **Destructive:** fundo vermelho suave (10-20% opacidade), não sólido —
  presente mas não agressivo, reservado a "Parar compartilhamento".
- **Link:** cor primária + sublinhado só no hover, sem fundo.

### Badges / Pills
- **Código da sala:** pílula (`rounded-full`), fundo carvão, borda sutil,
  fonte mono, texto cinza — sinaliza "identificador técnico" mais que
  "rótulo decorativo".
- **Indicador "ao vivo":** pílula translúcida preta (`bg-black/50`) com
  `backdrop-blur`, ponto verde com anel `animate-ping` (pulso), nome do
  participante — sempre sobreposta ao vídeo, nunca fora dele.

### Cards / Containers
- **Corner Style:** `rounded-xl` (0.875rem).
- **Background:** `bg-card` sólido pra cards isolados (dialog, popover);
  `bg-card/40` ou `bg-card/60` pra painéis dentro da sala (participantes,
  chat, área vazia de vídeo) — a transparência é o que os diferencia de um
  "card" tradicional.
- **Shadow Strategy:** nenhuma, exceto o cartão de entrada da home (ver
  Elevation & Depth).
- **Border:** `border-border` (branco 9% opacidade) ou `ring-1
  ring-foreground/10` — nunca uma borda sólida colorida.
- **Internal Padding:** `0.75rem` (painéis da sala) a `1rem` (cards padrão)
  a `1.5rem` (cartão de entrada da home).

### Inputs / Fields
- **Style:** fundo translúcido (`campo`, branco 7%), borda sutil, altura
  compacta (`h-8`), sem preenchimento sólido de cor.
- **Focus:** anel de 3px na cor verde ao vivo a 50% de opacidade — o único
  lugar fora do botão primário onde o acento aparece com essa intensidade.
- **Error:** borda + anel vermelho alerta, mesma lógica de opacidade.

### Video Tile (componente de assinatura)
- **Moldura:** `rounded-xl`, borda sutil, fundo preto puro (não o quase
  preto do tema — é a cor real de "sem sinal").
- **Legibilidade sobre o vídeo:** gradiente preto-pra-transparente no topo
  (`from-black/70`), só o suficiente pra badges de nome ficarem legíveis
  sobre qualquer conteúdo de tela.
- **Indicador "ao vivo":** ver Badges acima — sempre no canto superior
  esquerdo.
- **Controle de tela cheia:** botão circular translúcido no canto superior
  direito, some/aparece só no hover do tile inteiro (`group-hover`).

### Avatar / Identidade de participante
- **Forma:** círculo (`full`), iniciais em maiúsculo (2 letras).
- **Cor:** gerada por hash do id — ver "Identity color" em Colors. Mesma
  cor usada no nome dentro do chat, criando um fio visual entre lista de
  participantes e conversa sem precisar de um rótulo extra.

### Navigation
Não existe navegação persistente — só um header de sala (borda inferior,
`px-3`/`px-4`, `py-2.5`) com: nome do produto (escondido em mobile), badge
de código, espaçador flexível, e um cluster de ações à direita (compartilhar,
configurar, sair). Sem estado "ativo" de nav porque não há páginas irmãs
pra navegar entre — é uma única tela de trabalho.

## Do's and Don'ts

### Do:
- **Do** manter o verde ao vivo (`oklch(0.75 0.19 152)`) como o único acento
  saturado do sistema — reservado a estados "isto está ativo agora".
- **Do** resolver necessidade de profundidade com camadas de opacidade
  (`bg-card/NN`) antes de adicionar `box-shadow` novo.
- **Do** usar fonte mono só pra identificadores técnicos (código de sala),
  nunca em texto corrido.
- **Do** manter bordas como branco translúcido (`oklch(1 0 0 / 9%)`), nunca
  uma cor neutra sólida.

### Don't:
- **Don't** introduzir um segundo tema (claro/escuro) — decisão de produto
  confirmada (ADR 007 em `docs/decisions.md`), não um detalhe visual em
  aberto.
- **Don't** usar o verde de forma decorativa (ícones neutros, fundos
  genéricos) — isso dilui o único sinal que o sistema tem pra "ao vivo".
- **Don't** dar ao chrome da sala (participantes, chat, header) o mesmo peso
  de sombra do cartão de entrada da home — essa elevação é exclusiva do
  momento de "chegada", antes de entrar na sala.
- **Don't** trocar a cor por hash de um participante por uma paleta fixa —
  a regra é geração determinística por id, não um conjunto de swatches.
