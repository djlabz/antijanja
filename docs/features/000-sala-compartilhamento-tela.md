# 000 - Sala de compartilhamento de tela

## Objetivo
Um grupo pequeno de amigos entra na mesma sala (só com um nome, sem cadastro),
qualquer um pode compartilhar a tela pros outros e todo mundo pode conversar
por chat de texto — tudo rodando do PC de quem hospeda a sessão, sem custo.

## Escopo desta versão ("essencial")
- Entrar numa sala com nome + código (ou criar uma sala nova com código
  gerado).
- Compartilhar tela (com áudio do sistema, se o navegador suportar) pra todo
  mundo na sala.
- Ver quem está na sala e quem está compartilhando no momento.
- Chat de texto por sala.
- Copiar o link da sala pra mandar pros amigos.

## Fora do escopo (adiado, ver `docs/tasks.md`)
- Contas/login (Discord, Google).
- Lista de salas públicas e mapa de salas.
- Webcam/microfone dos participantes (só a tela compartilhada, por enquanto).
- Persistência de mensagens/salas entre reinícios do servidor.
- TURN server (ver ADR 003 em `docs/decisions.md`).

## Fluxo
1. Usuário abre `/`, digita o nome e (opcionalmente) um código de sala →
   `/sala/[codigo]`.
2. Cliente conecta no Socket.IO (mesma origem) e emite `sala:entrar`.
3. Servidor devolve a lista de participantes já na sala e avisa os outros
   que alguém entrou.
4. Quem clica em "Compartilhar tela" chama `getDisplayMedia`, abre uma
   `RTCPeerConnection` por espectador já presente na sala e manda uma
   oferta SDP via `webrtc:sinal` (relay do servidor, que só encaminha —
   não entende o conteúdo).
5. Espectadores respondem com uma resposta SDP; candidatos ICE trocam nos
   dois sentidos até a conexão P2P direta se estabelecer.
6. Quem entra depois de um compartilhamento já em andamento recebe uma nova
   oferta automaticamente de cada pessoa que já está compartilhando.

## Arquivos principais
- `server.ts` — servidor HTTP customizado (Next + Socket.IO).
- `src/server/rooms.ts` — estado das salas em memória.
- `src/lib/socket-events.ts` — contrato de eventos compartilhado.
- `src/hooks/use-sala.ts` — toda a lógica de cliente (sinalização + WebRTC).
- `src/components/sala/*` — UI da sala.
