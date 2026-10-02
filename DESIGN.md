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
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Pixelify Sans, ui-monospace, monospace"
    fontSize: "0.75rem"
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
  sm: "0.6rem"
  md: "0.8rem"
  lg: "1rem"
  xl: "1.4rem"
  pilula: "9999px"
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

**The Legible-Dim Rule.** Esmaecer é permitido, mas texto continua com 4,5:1
de contraste (medido na auditoria de 2026-10-02). Por isso a profundidade da
fila de participantes vai na COR do nome e no avatar, não numa opacidade na
linha inteira — e texto secundário não usa `/70`, `/80` ou menos sobre o vazio.

**Hex nas imagens de prévia.** As imagens Open Graph (`opengraph-image.tsx`)
são desenhadas por um motor que não lê `oklch`; lá valem equivalentes em hex:
vazio `#020203`, marfim `#f4efe6`, sinal-âmbar `#f4a437`, poeira-3 `#a9a9ad`,
poeira-2 `#6b6b70`. É aproximação consciente, não paleta nova.

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
- **Headline** (Geist 600, 1.25rem): título do estado vazio ("Você está
  sozinho por aqui"). Na sans, não na bitmap — é frase, não rótulo.
- **Label** (Pixelify Sans 500, 0.75rem, uppercase, `foreground/75`):
  rótulos de seção ("PARTICIPANTES · 3", "CHAT"). Já foi 11px; subiu pra
  12px (e ganhou contraste) porque no monitor grande ficava pequeno e fraco.
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
**The Soft-Surface Rule.** Painéis de conteúdo (participantes, chat) ganharam
uma superfície suave própria — branco a ~3,5% sobre o vazio, `rounded-3xl` —
porque, com cantos arredondados, "zona solta no vazio" deixa de ler como
intencional e passa a parecer inacabada. Continua sem sombra: a separação é
só de tom. Overlays flutuantes (dialog, popover, select, chat em tela cheia)
seguem com o fundo sólido `carvao-flutuante`.

## Shapes

Linguagem arredondada (decisão do usuário, ver ADR 023): base `1rem`, com a
escala `sm` 0.6rem · `md` 0.8rem · `lg` 1rem · `xl` 1.4rem, e **pílula**
(`rounded-full`) pra todo controle — botões, campos, abas, contadores.
Superfícies grandes usam `rounded-2xl`/`rounded-3xl` (vídeo, painéis, balões
de chat). Avatares são círculos. **Exceção:** em tela cheia o vídeo perde o
canto (`rounded-none`), senão sobra um vão preto nos quatro cantos. O tile do
vídeo se ajusta à proporção real da imagem — se ele fosse maior que a imagem,
o canto arredondado cairia num quadro preto e o vídeo continuaria reto.

## Components

### Buttons
- **Shape:** pílula (`rounded-full`); ícones sozinhos viram círculo.
- **Primary:** fundo âmbar sólido, texto âmbar-profundo.
- **Outline:** transparente, texto em poeira-4, borda quase invisível
  (opacidade 60% da borda padrão) que só fica nítida no hover.
- **Ghost:** transparente, texto em poeira-3 (mais apagado que outline).
- **Destructive:** vermelho suave, igual ao sistema anterior.

### Campos de Formulário
- **Style:** pílula preenchida (`rounded-full`, fundo `campo` a 30%, borda
  fina) que ganha borda e anel âmbar em foco. O sublinhado do mundo anterior
  saiu junto com os cantos retos.
- **Rótulo:** prompt de terminal minúsculo em mono (`nome>`, `código>`),
  mantido.
- **Cursor:** um cursor âmbar piscando (`.cursor-terminal`) aparece só em
  texto estático de destaque (o wordmark "SINAL", o título de convite) —
  nunca dentro do próprio `<input>`, que não suporta pseudo-elemento.

### Video Tile / YouTube Player (componente de assinatura)
- **Moldura:** `rounded-2xl` sem borda; o tile tem a proporção exata do
  vídeo (ver Shapes) e é centralizado na célula.
- **Legenda:** texto direto sobre o gradiente escuro no topo, sem pílula de
  fundo — nome em Pixelify Sans + ponto âmbar pulsante, como uma linha de
  crédito de abertura.
- **Controles** (tela cheia, destacar, volume, estatísticas): ícone puro
  com `drop-shadow`, aparecem só no hover.

### Fila de Participantes (era "Lista de Participantes")
- **Ordenação:** quem compartilha primeiro (plano da frente); resto depois,
  com o nome em `foreground/70` e o avatar a 85% (ver Legible-Dim Rule).
- **Marcador de identidade:** círculo de 24px, cor gerada por hash do id,
  iniciais em preto por cima.
- **Linha em pílula** com hover suave (`white/4%`) — fica dentro do painel
  arredondado, não solta no vazio.

### Dialog / Popover / Select (superfícies flutuantes — mantidas)
Fundo sólido `carvao-flutuante` por serem overlays, com `rounded-xl` (1.4rem
agora). Mesma lógica de funcionamento do sistema anterior
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

### Chat (balões)
- Mensagem minha à direita, `bg-primary/15`; dos outros à esquerda,
  `white/6%`; `rounded-2xl` com o canto de baixo do lado do autor menos
  arredondado (`rounded-br-md`/`rounded-bl-md`), o "rabinho" do balão.
- Nome (na cor do participante) e horário em 11px acima; campo de mensagem
  em pílula com botão de enviar circular âmbar.

### Abas do celular
Controle segmentado em pílula (`white/5%`) com a aba ativa em `white/10%`;
o contador de não lidas é uma pílula âmbar. Semanticamente é um grupo de
botões com `aria-pressed` (não `role=tab`: não há painéis ligados por
`aria-controls`). Alvos de 44px de altura.

### Alvos de toque
Em dispositivos sem hover (`@media (hover: none)`) todo `Button` tem no mínimo
44×44px e o `Input` 44px de altura; no desktop os tamanhos seguem os da escala
(`h-8` etc.). O cabeçalho da sala quebra em duas linhas em vez de estourar a
largura (tablet, janela estreita).
