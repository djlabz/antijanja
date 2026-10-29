/**
 * Título e miniatura de um vídeo/playlist do YouTube pra mostrar na fila.
 * Vêm do oEmbed público do YouTube (sem chave de API, aceita chamada direto do
 * navegador) e ficam num cache em memória: cada item é buscado uma vez só,
 * mesmo aparecendo em vários lugares. Sem `window`/React aqui, pra testar —
 * `use-info-youtube.ts` liga isso ao React.
 */

export interface InfoYoutube {
  titulo: string;
  autor: string | null;
  /** `null` = o YouTube não deu uma (a playlist cai num ícone). */
  miniatura: string | null;
}

export interface RefYoutube {
  youtubeId: string;
  ehPlaylist: boolean;
}

const MAX_TEXTO = 200;
const HOST_MINIATURA = "i.ytimg.com";

/** Miniatura de um vídeo sem precisar perguntar nada ao YouTube (320×180). */
export function miniaturaDoVideo(youtubeId: string): string {
  return `https://${HOST_MINIATURA}/vi/${encodeURIComponent(youtubeId)}/mqdefault.jpg`;
}

export function urlOembed({ youtubeId, ehPlaylist }: RefYoutube): string {
  const pagina = ehPlaylist
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(youtubeId)}`
    : `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
  return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(pagina)}`;
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.replace(/\s+/g, " ").trim().slice(0, MAX_TEXTO);
  return limpo || null;
}

/** Só aceita miniatura servida pelo próprio YouTube (https), nunca um endereço qualquer. */
function miniaturaSegura(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && url.hostname === HOST_MINIATURA ? url.href : null;
  } catch {
    return null;
  }
}

/** Lê o JSON do oEmbed sem confiar no formato: `null` se não tem nem título. */
export function lerRespostaOembed(json: unknown): InfoYoutube | null {
  if (typeof json !== "object" || json === null) return null;
  const dados = json as Record<string, unknown>;
  const titulo = texto(dados.title);
  if (!titulo) return null;
  return {
    titulo,
    autor: texto(dados.author_name),
    miniatura: miniaturaSegura(dados.thumbnail_url),
  };
}

// --- cache -----------------------------------------------------------------

/** `null` = o YouTube respondeu que não conhece (vídeo apagado, privado...). Ausente = ainda não buscou. */
const cache = new Map<string, InfoYoutube | null>();
const buscando = new Set<string>();
const ouvintes = new Set<() => void>();

const chave = ({ youtubeId, ehPlaylist }: RefYoutube) => `${ehPlaylist ? "lista" : "video"}:${youtubeId}`;

export function lerInfo(ref: RefYoutube): InfoYoutube | null | undefined {
  return cache.get(chave(ref));
}

export function assinarInfo(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
  };
}

/** Busca (uma vez) e avisa quem assina. Falha de rede não entra no cache: tenta de novo na próxima. */
export async function carregarInfo(
  ref: RefYoutube,
  buscar: typeof fetch = fetch
): Promise<void> {
  const id = chave(ref);
  if (cache.has(id) || buscando.has(id)) return;
  buscando.add(id);
  try {
    const resposta = await buscar(urlOembed(ref));
    // 4xx = o YouTube sabe que esse vídeo não existe/não é público: guardar a
    // resposta evita perguntar de novo a cada vez que a lista é redesenhada.
    if (resposta.status >= 400 && resposta.status < 500) {
      cache.set(id, null);
    } else if (resposta.ok) {
      cache.set(id, lerRespostaOembed(await resposta.json()));
    } else {
      return;
    }
    ouvintes.forEach((aviso) => aviso());
  } catch {
    // Sem rede (ou resposta quebrada): fica sem título por ora.
  } finally {
    buscando.delete(id);
  }
}

/** Só pra testes. */
export function limparCacheDeInfo() {
  cache.clear();
  buscando.clear();
}
