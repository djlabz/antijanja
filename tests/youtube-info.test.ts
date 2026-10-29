import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assinarInfo,
  carregarInfo,
  lerInfo,
  lerRespostaOembed,
  limparCacheDeInfo,
  miniaturaDoVideo,
  urlOembed,
} from "../src/lib/youtube-info";

const video = { youtubeId: "dQw4w9WgXcQ", ehPlaylist: false };
const lista = { youtubeId: "PLabc_123-x", ehPlaylist: true };

function resposta(status: number, corpo: unknown = {}) {
  return new Response(JSON.stringify(corpo), { status });
}

describe("youtube-info", () => {
  beforeEach(limparCacheDeInfo);

  it("monta a URL do oEmbed pra vídeo e pra playlist", () => {
    const u = new URL(urlOembed(video));
    assert.equal(u.origin + u.pathname, "https://www.youtube.com/oembed");
    assert.equal(u.searchParams.get("url"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.equal(
      new URL(urlOembed(lista)).searchParams.get("url"),
      "https://www.youtube.com/playlist?list=PLabc_123-x"
    );
  });

  it("a miniatura de vídeo não depende de buscar nada", () => {
    assert.equal(miniaturaDoVideo("dQw4w9WgXcQ"), "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  });

  describe("lerRespostaOembed", () => {
    it("lê título, autor e miniatura", () => {
      assert.deepEqual(
        lerRespostaOembed({
          title: "  Um   vídeo \n bom ",
          author_name: "Canal",
          thumbnail_url: "https://i.ytimg.com/vi/x/hqdefault.jpg",
        }),
        { titulo: "Um vídeo bom", autor: "Canal", miniatura: "https://i.ytimg.com/vi/x/hqdefault.jpg" }
      );
    });

    it("recusa miniatura que não é do YouTube (ou não é https)", () => {
      for (const thumbnail_url of [
        "https://evil.example/x.jpg",
        "http://i.ytimg.com/vi/x/a.jpg",
        "javascript:alert(1)",
        "não é url",
        42,
      ]) {
        assert.equal(lerRespostaOembed({ title: "t", thumbnail_url })?.miniatura, null);
      }
    });

    it("sem título (ou lixo) não vale", () => {
      assert.equal(lerRespostaOembed({}), null);
      assert.equal(lerRespostaOembed({ title: "   " }), null);
      assert.equal(lerRespostaOembed({ title: 5 }), null);
      assert.equal(lerRespostaOembed(null), null);
      assert.equal(lerRespostaOembed("oi"), null);
    });

    it("corta título gigante", () => {
      assert.equal(lerRespostaOembed({ title: "a".repeat(5000) })?.titulo.length, 200);
    });
  });

  describe("cache", () => {
    it("busca uma vez só e avisa quem assina", async () => {
      let chamadas = 0;
      let avisos = 0;
      const parar = assinarInfo(() => avisos++);
      const buscar = (async () => {
        chamadas++;
        return resposta(200, { title: "Título", author_name: "Canal" });
      }) as typeof fetch;

      assert.equal(lerInfo(video), undefined);
      await Promise.all([carregarInfo(video, buscar), carregarInfo(video, buscar)]);
      await carregarInfo(video, buscar);
      parar();

      assert.equal(chamadas, 1);
      assert.equal(avisos, 1);
      assert.equal(lerInfo(video)?.titulo, "Título");
    });

    it("vídeo que o YouTube não conhece (4xx) vira null e não é perguntado de novo", async () => {
      let chamadas = 0;
      const buscar = (async () => {
        chamadas++;
        return resposta(400);
      }) as typeof fetch;
      await carregarInfo(video, buscar);
      await carregarInfo(video, buscar);
      assert.equal(lerInfo(video), null);
      assert.equal(chamadas, 1);
    });

    it("falha de rede ou erro do YouTube (5xx) não vira resposta: tenta de novo depois", async () => {
      await carregarInfo(video, (async () => {
        throw new TypeError("sem rede");
      }) as typeof fetch);
      assert.equal(lerInfo(video), undefined);

      await carregarInfo(video, (async () => resposta(503)) as typeof fetch);
      assert.equal(lerInfo(video), undefined);

      await carregarInfo(video, (async () => resposta(200, { title: "Agora foi" })) as typeof fetch);
      assert.equal(lerInfo(video)?.titulo, "Agora foi");
    });

    it("vídeo e playlist com o mesmo código não se misturam", async () => {
      const mesmo = { youtubeId: "abc", ehPlaylist: false };
      const igual = { youtubeId: "abc", ehPlaylist: true };
      await carregarInfo(mesmo, (async () => resposta(200, { title: "Vídeo" })) as typeof fetch);
      assert.equal(lerInfo(igual), undefined);
    });
  });
});
