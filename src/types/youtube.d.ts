/**
 * Tipagem mínima da IFrame Player API do YouTube — só o que este projeto
 * usa. Não instalamos `@types/youtube` (pacote inteiro) pra isso.
 * https://developers.google.com/youtube/iframe_api_reference
 */
declare namespace YT {
  interface OnStateChangeEvent {
    data: number;
  }

  interface PlayerEvents {
    onReady?: () => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
  }

  interface PlayerOptions {
    videoId?: string;
    playerVars?: Record<string, string | number>;
    events?: PlayerEvents;
  }

  class Player {
    constructor(elemento: HTMLElement, opcoes: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    seekTo(segundos: number, permitirAvancar: boolean): void;
    getCurrentTime(): number;
    getPlayerState(): number;
    loadVideoById(videoId: string): void;
    loadPlaylist(opcoes: { list: string }): void;
    destroy(): void;
  }

  const PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
