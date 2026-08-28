/**
 * Extrai id de vídeo/playlist de uma URL do YouTube — só parsing de string,
 * sem `window`/DOM, por isso pode ser importado tanto do lado do Next
 * (`@/lib/youtube`) quanto de `server.ts` (import relativo), igual
 * `socket-events.ts`.
 */

export interface YoutubeRef {
  id: string;
  ehPlaylist: boolean;
}

const HOSTS_YOUTUBE = new Set([
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
  "music.youtube.com",
]);

export function extrairYoutube(link: string): YoutubeRef | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (!HOSTS_YOUTUBE.has(host)) return null;

  const listId = url.searchParams.get("list");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (id) return { id, ehPlaylist: false };
  }

  if (url.pathname === "/watch") {
    const videoId = url.searchParams.get("v");
    if (videoId) return { id: videoId, ehPlaylist: false };
  }

  if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
    const id = url.pathname.split("/")[2];
    if (id) return { id, ehPlaylist: false };
  }

  // /playlist?list=... ou qualquer URL com `list=` sem vídeo reconhecido.
  if (listId) return { id: listId, ehPlaylist: true };

  return null;
}
