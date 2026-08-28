---
name: Sinal
description: Compartilhamento de tela em grupo, sem cadastro — a lista de quem está na sala como uma fila de créditos de demoscene às 2h da manhã.
colors:
  vazio: "oklch(0.09 0.004 260)"
  marfim: "oklch(0.95 0.012 80)"
  carvao-flutuante: "oklch(0.14 0.006 260)"
  carvao-elevado: "oklch(0.13 0.006 260)"
  poeira-1: "oklch(0.30 0.006 260)"
  poeira-2: "oklch(0.46 0.008 260)"
  poeira-3: "oklch(0.64 0.010 260)"
  poeira-4: "oklch(0.95 0.012 80)"
  sinal-ambar: "oklch(0.78 0.15 70)"
  sinal-ambar-profundo: "oklch(0.17 0.03 70)"
  grafite: "oklch(0.20 0.006 260)"
  ambar-acento: "oklch(0.24 0.03 70)"
  ambar-acento-texto: "oklch(0.90 0.05 70)"
  vermelho-alerta: "oklch(0.60 0.20 22)"
  vermelho-alerta-texto: "oklch(0.97 0.01 22)"
  borda: "oklch(1 0 0 / 8%)"
  campo: "oklch(1 0 0 / 6%)"
  anel-foco: "oklch(0.78 0.15 70 / 55%)"
typography:
  wordmark:
    fontFamily: "Pixelify Sans, ui-monospace, monospace"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.04em"
  label:
    fontFamily: "Pixelify Sans, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.03em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "0.15rem"
  md: "0.2rem"
  lg: "0.25rem"
  xl: "0.35rem"
  full: "9999px"
spacing:
  xs: "0.375rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.sinal-ambar}"
    textColor: "{colors.sinal-ambar-profundo}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.625rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.poeira-4}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.625rem"
  button-destructive:
    backgroundColor: "{colors.vermelho-alerta}"
    textColor: "{colors.vermelho-alerta}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.625rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.marfim}"
    rounded: "0px"
    padding: "0.25rem 0.125rem"
---

# Design System: Sinal

<!-- impeccable:design-provenance seed=22df9449 direction="Fila de Créditos Cracktro" verdict="wins vs Painel de Controle Comunitário" -->

## Overview

**Creative North Star: "A Fila de Créditos"**

Sinal (antes "Tela Junto") é a tela de abertura de um cracktro/demoscene
rodando às 2h da manhã: um vazio preto emissivo quase sem interface, onde
hierarquia é PROFUNDIDADE — brilho e opacidade — nunca contorno. Quem está
compartilhando a tela agora é o plano da frente: nítido, opaco, em destaque.
Quem só está presente na sala fica atrás, na penumbra, como um nome que
rolou nos créditos e ainda não teve sua vez. Não existem cards, painéis ou
bordas fechadas ao redor de conteúdo — cada zona da tela (participantes,
chat, vídeo) vive direto no vazio, separada só por espaço e por uma linha
de base sob seu rótulo.

Essa direção venceu, num confronto direto contra um mundo mais literal
("Painel de Controle Comunitário" — mesa de som de rádio comunitária), por
identificação de público: a cultura de LAN house/demoscene de madrugada é
mais reconhecível pro público real do produto — amigos técnicos, sessão
informal, self-hosted — do que uma metáfora de estúdio profissional (ver
seed `22df9449` em `.impeccable/`).

O nome do produto mudou de "Tela Junto" pra **Sinal**, continuando o
conceito que já existia informalmente no sistema anterior (a regra do
"sinal único") — agora o nome do produto É a própria ideia central, não só
uma regra de cor.

**Key Characteristics:**
- Sem cards, sem bordas fechadas — hierarquia por brilho/opacidade, não por caixa.
- Participantes ordenados por estado: quem compartilha é o plano da frente.
- Um único sinal âmbar (era verde) — o único acento saturado do sistema.
- Tipografia bitmap (Pixelify Sans) só em wordmark/rótulos; corpo de texto
  continua numa sans humanista, por legibilidade em português acentuado.
- Campos de formulário são linhas de comando (`nome>`), não caixas — com
  cursor piscando no lugar de placeholder decorativo.

## Colors

Paleta quase monocromática (vazio preto + 4 tons de poeira cinza) com um
único acento âmbar, reservado a sinal/foco/cursor — igual em função à regra
anterior, só que mais quente.

### Primary
- **Sinal Âmbar** (`oklch(0.78 0.15 70)`): o único acento saturado. Usado no
  botão de ação primária, no cursor piscante dos campos de nome/código, no
  ponto pulsante de "ao vivo" sobre cada vídeo, e no anel de foco de
  teclado. Nunca decorativo.
- **Sinal Âmbar Profundo** (`oklch(0.17 0.03 70)`): texto sobre o âmbar.

### Neutral (a escala de "poeira")
- **Vazio** (`oklch(0.09 0.004 260)`): fundo da aplicação — mais escuro que
  o "quase preto" do sistema anterior; é o vácuo emissivo do cracktro, não
  uma sala com paredes.
- **Poeira 1** (`oklch(0.30 0.006 260)`) → **Poeira 4 / Marfim**
  (`oklch(0.95 0.012 80)`): rampa de profundidade usada pra codificar
  estado — quem só está presente fica em opacidade baixa (perto de
  Poeira 1); quem compartilha agora fica em opacidade cheia (Poeira 4 /
  Marfim). Marfim também é o texto principal do sistema — quente, não o
  branco-azulado frio do sistema anterior.
- **Carvão Flutuante** (`oklch(0.14 0.006 260)`) / **Carvão Elevado**
  (`oklch(0.13 0.006 260)`): reservados só a superfícies flutuantes que
  PRECISAM de uma caixa por função (dialog, popover, select) — nunca usados
  na página em si.
- **Borda** (`oklch(1 0 0 / 8%)`): usada com extrema raridade agora — só sob
  rótulos de seção (uma linha, não uma caixa) e no header. Onde antes toda
  superfície tinha borda, agora a ausência de borda é o padrão.
- **Campo** (`oklch(1 0 0 / 6%)`): não usado mais como fundo de input — os
  campos agora não têm fundo, só uma linha de base.

### Alert
- **Vermelho Alerta** (`oklch(0.60 0.20 22)`) / **Vermelho Alerta Texto**
  (`oklch(0.97 0.01 22)`): "Parar compartilhamento" e erros — papel
  idêntico ao sistema anterior.

### Named Rules
**The Depth-Is-State Rule.** Estado de um participante (compartilhando vs.
só presente) é comunicado por PROFUNDIDADE — opacidade/brilho — nunca por
um badge, cor de fundo ou borda extra. Um participante "ativo" com o mesmo
brilho que um "ausente" quebra a regra que dá à lista seu significado.

**The No-Enclosure Rule.** Nenhuma zona de conteúdo da página (participantes,
chat, vídeo, formulário) fica dentro de uma caixa fechada (card, painel com
fundo+borda). Enclosura só é permitida em superfícies que PRECISAM dela pra
função — um dialog ou popover flutuante — nunca como decoração de layout.

### Identity color (por participante, gerado — não é paleta fixa)
Continua igual ao sistema anterior: `oklch(0.6 0.14 <matiz>)` derivado por
hash do id do participante (`src/lib/cor-participante.ts`). O que mudou é a
forma do marcador — de um círculo de avatar pra um quadrado de 16px (ver
Components), reforçando o vocabulário bitmap/blocado do resto do sistema.

## Typography

**Wordmark/Rótulos:** Pixelify Sans (bitmap), com fallback mono.
**Corpo de texto:** Geist (sans humanista) — chat, descrições, ajuda.
**Identificadores técnicos:** Geist Mono — código da sala, prompts de campo.

**Character:** Um wordmark bitmap pixelado contra um corpo de texto sans
neutro — a mesma lógica de "um mundo, dois registros" do sistema anterior
(que usava mono só pro código da sala), só que agora o registro "técnico"
também cobre o próprio nome do produto e os rótulos de seção.

### Hierarchy
- **Wordmark** (Pixelify Sans 600, 2.25rem): só o "SINAL" da home. Não se
  repete em tamanho grande em nenhum outro lugar do produto.
- **Label** (Pixelify Sans 500, 11px, uppercase): rótulos de seção
  ("PARTICIPANTES · 3", "CHAT") — reduzido de 12px pra 11px porque a face
  bitmap lê mais "pesada" que a sans no mesmo tamanho nominal.
- **Body** (Geist 400, 0.875rem): texto corrido — nunca na face bitmap, por
  legibilidade em português acentuado em tamanho pequeno.
- **Mono** (Geist Mono 400, 0.75rem): código da sala e os prompts `nome>`/
  `código>` dos formulários.

### Named Rules
**The Bitmap-For-Chrome-Only Rule.** A face bitmap (Pixelify Sans) é
reservada a wordmark e rótulos de seção — nunca texto corrido. Colocar uma
mensagem de chat ou uma descrição inteira em bitmap sacrifica legibilidade
real por fidelidade literal ao mundo visual; a clareza do produto vence.

## Layout

Estrutura inalterada (grid de 3 colunas em desktop, `200px_1fr_280px`,
empilhado em mobile com vídeo primeiro) — o que mudou é que as colunas não
são mais painéis com fundo/borda: são zonas de conteúdo soltas no vazio,
cada uma introduzida por um rótulo com uma linha de base fina embaixo. Gaps
aumentaram ligeiramente (de 0.75rem pra até 1.25rem em mobile) porque sem
caixa a separação de espaço faz mais trabalho visual.

## Elevation & Depth

Sistema sem elevação nenhuma — nem a opacidade em camadas do sistema
anterior. Não existe "superfície elevada" na página em si; a única
profundidade que existe é a hierarquia de brilho entre participantes
(Depth-Is-State Rule). Dialog/popover/select continuam com uma superfície
sólida (`carvao-flutuante`) por serem overlays flutuantes — função exige
uma caixa ali, não decoração de página.

### Named Rules
**The Overlay-Only Surface Rule.** Uma superfície sólida com fundo próprio
só existe onde a função exige flutuar sobre o conteúdo (dialog, popover,
select). Qualquer elemento que vive no fluxo normal da página nunca ganha
um fundo próprio.

## Shapes

Raio de canto reduzido de propósito: base `0.25rem` (era `0.625rem`) —
botões e inputs (onde ainda existe canto) usam `sm` (2.4px, quase reto).
Vídeo e YouTube player perderam o canto arredondado inteiramente (retos,
sangrando até a borda do próprio grid) — o plano de vídeo é o objeto, não
um cartão que contém um objeto. Avatares deixaram de ser círculos: agora
são quadrados de 16px, reforçando o vocabulário bitmap/blocado.

## Components

### Buttons
- **Shape:** `rounded-sm` (2.4px, quase reto — era pílula/lg antes).
- **Primary:** fundo âmbar sólido, texto âmbar-profundo.
- **Outline:** transparente, texto em poeira-4, borda quase invisível
  (opacidade 60% da borda padrão) que só fica nítida no hover.
- **Ghost:** transparente, texto em poeira-3 (mais apagado que outline).
- **Destructive:** vermelho suave, igual ao sistema anterior.

### Campos de Formulário (mudança estrutural)
- **Style:** sem fundo, sem borda fechada — só uma linha de base
  (`border-bottom`) que troca pra âmbar em foco. Sem anel de foco (ring)
  como no sistema anterior — o próprio traço de base já sinaliza o estado.
- **Rótulo:** prompt de terminal minúsculo em mono (`nome>`, `código>`),
  substituindo o rótulo em title case do sistema anterior.
- **Cursor:** um cursor âmbar piscando (`.cursor-terminal`) aparece só em
  texto estático de destaque (o wordmark "SINAL", o título de convite) —
  nunca dentro do próprio `<input>`, que não suporta pseudo-elemento.

### Video Tile / YouTube Player (componente de assinatura)
- **Moldura:** sem borda, sem canto arredondado — preto puro sangrando até
  a borda do grid.
- **Legenda:** texto direto sobre o gradiente escuro no topo, sem pílula de
  fundo — nome em Pixelify Sans + ponto âmbar pulsante, como uma linha de
  crédito de abertura.
- **Controle de tela cheia / remover vídeo:** ícone puro (sem fundo
  circular), com `drop-shadow` pra legibilidade, aparece só no hover.

### Fila de Participantes (era "Lista de Participantes")
- **Ordenação:** quem compartilha primeiro (plano da frente); resto depois,
  em opacidade 55%.
- **Marcador de identidade:** quadrado de 16px (era círculo), cor gerada
  por hash do id, iniciais em preto por cima.
- **Sem hover de fundo, sem linha por item** — cada participante é uma
  linha de texto solta, não uma célula de lista.

### Dialog / Popover / Select (superfícies flutuantes — mantidas)
Únicos componentes que continuam com fundo sólido e canto levemente
arredondado, por serem overlays: `carvao-flutuante`, `rounded-xl` (0.35rem
agora, era 0.875rem). Mesma lógica de funcionamento do sistema anterior
(controlados + desmontados quando fechados, ver ADR 012).

## Do's and Don'ts

### Do:
- **Do** manter o âmbar (`oklch(0.78 0.15 70)`) como o único acento
  saturado — sinal/foco/cursor, nunca decoração.
- **Do** comunicar estado de participante por profundidade (opacidade),
  nunca por badge ou cor de fundo extra.
- **Do** reservar a face bitmap (Pixelify Sans) pra wordmark e rótulos —
  corpo de texto sempre na sans humanista.
- **Do** deixar dialog/popover/select como as únicas superfícies com fundo
  sólido — qualquer outro elemento vive solto no vazio.

### Don't:
- **Don't** colocar um card, painel com fundo, ou borda fechada ao redor de
  uma zona de conteúdo que vive no fluxo normal da página.
- **Don't** usar o âmbar de forma decorativa — dilui o único sinal que o
  sistema tem.
- **Don't** colocar texto corrido (chat, descrições) na face bitmap —
  sacrifica legibilidade real por literalidade do mundo visual.
- **Don't** reintroduzir alternância de tema claro/escuro (ADR 007) nem
  voltar a coletar nome de exibição na home (ADR 016) — decisões de produto
  que sobrevivem a qualquer redesign.
