# 001 - Recursos de uso na sala (celular e desktop)

Especificação do que a sala faz além do básico de `000-sala-compartilhamento-tela.md`.
As decisões e o "porquê" estão nos ADRs 020 a 024 (`docs/decisions.md`).

## Atalhos de teclado (desktop)
Ignorados enquanto se digita num campo ou com um diálogo aberto.

| Tecla | Faz |
|---|---|
| `F` | tela cheia (sai se já estiver) |
| `M` | silencia/ativa o som da transmissão em foco |
| `C` | modo cinema (esconde a lista de participantes) |
| `P` | Picture-in-Picture (janela flutuante) |
| `/` | foca o campo do chat (em tela cheia, abre o chat sobreposto) |

"Transmissão em foco" = a destacada, senão a primeira.

## Chat
- Balões: os meus à direita, dos outros à esquerda, com nome e horário.
- Avisos de sistema "Fulano entrou/saiu" (gerados no cliente; não contam
  como não lidas).
- Reações rápidas (👍 😂 🔥 ❤️ 😮 👏): flutuam sobre o vídeo de todos; lista
  fechada no servidor (`REACOES`), máximo 8/s por pessoa.
- No celular o chat é uma aba ao lado de "Participantes", com contador de
  não lidas.

## Vídeo
- Volume e mudo por transmissão (só do meu lado); estatísticas de recepção
  (`720p · 20 fps · 0,4 Mbps`) no hover.
- Com 2+ telas: botão de destacar (as outras viram miniaturas).
- Tela cheia: chat sobreposto; controles e cursor somem após 3s parado.
- Celular: duplo toque = tela cheia; tela cheia trava em paisagem (onde o
  navegador deixa); a tela do aparelho não apaga enquanto há transmissão.

## Conexão
- Cair e voltar (rede, tela bloqueada) reentra na sala e retoma o vídeo;
  faixa "Reconectando…" enquanto isso. O id do participante muda a cada
  reconexão.

- Se a conexão de VÍDEO com alguém não fecha, o espectador vê no lugar do
  quadro preto: "Conectando com X…", "Conexão com X instável…" ou "Não foi
  possível conectar com X" (rede restritiva; ver README, "Ligar um servidor
  TURN"). Quem transmite refaz o caminho sozinho até 3 vezes.
- Se o navegador barrar o autoplay com som, o vídeo toca mudo e aparece
  "Tocar com som".

## Aviso com a aba escondida (desktop)
Contador no título ("(3) Sinal") e bipe opcional (sino no cabeçalho, salvo
no `localStorage`) quando chega mensagem ou alguém começa a transmitir.

## Convite
- Botão de copiar link no cabeçalho; diálogo de convite; convite no estado
  vazio quando a pessoa está sozinha.
- No celular, botão "Compartilhar…" abre o menu nativo do aparelho.

## Respeita "reduzir movimento"
Sem transições nem animações; reações viram só um fade.
