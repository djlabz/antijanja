/**
 * Tela compartilhada é quase sempre horizontal: no celular em pé, tela cheia
 * deixaria uma faixa estreita. Trava em paisagem enquanto está em tela cheia
 * (quem escuta `fullscreenchange` destrava na saída). Só onde o navegador
 * deixa (Chrome/Android) — em qualquer outro falha em silêncio.
 */
function travarPaisagem() {
  const ehToque = window.matchMedia("(hover: none)").matches;
  const orientacao = screen.orientation as ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  };
  if (ehToque) orientacao.lock?.("landscape").catch(() => {});
}

/**
 * Entra/sai da tela cheia de um bloco (o `container` inteiro, pra os
 * controles e o chat sobreposto irem junto). Fora do módulo do componente
 * porque também é acionado por atalho de teclado (`F`) sem passar por ele.
 */
export function alternarTelaCheia(
  container: HTMLElement | null,
  video: HTMLVideoElement | null
) {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }
  if (container?.requestFullscreen) {
    container
      .requestFullscreen()
      .then(travarPaisagem)
      .catch(() => {});
  } else {
    // iPhone/iOS Safari só deixa colocar o próprio <video> em tela cheia.
    (video as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)
      ?.webkitEnterFullscreen?.();
  }
}
