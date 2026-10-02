import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extrairYoutube } from "../src/lib/youtube";

describe("extrairYoutube", () => {
  it("reconhece os formatos de vídeo", () => {
    const esperado = { id: "dQw4w9WgXcQ", ehPlaylist: false };
    assert.deepEqual(extrairYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), esperado);
    assert.deepEqual(extrairYoutube("https://youtu.be/dQw4w9WgXcQ"), esperado);
    assert.deepEqual(extrairYoutube("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30"), esperado);
    assert.deepEqual(extrairYoutube("https://www.youtube.com/shorts/dQw4w9WgXcQ"), esperado);
    assert.deepEqual(extrairYoutube("https://www.youtube.com/embed/dQw4w9WgXcQ"), esperado);
    assert.deepEqual(extrairYoutube("  https://youtu.be/dQw4w9WgXcQ  "), esperado);
  });

  it("reconhece playlist", () => {
    assert.deepEqual(extrairYoutube("https://www.youtube.com/playlist?list=PLabc_123-x"), {
      id: "PLabc_123-x",
      ehPlaylist: true,
    });
  });

  it("vídeo dentro de playlist vale como vídeo", () => {
    assert.deepEqual(extrairYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc"), {
      id: "dQw4w9WgXcQ",
      ehPlaylist: false,
    });
  });

  it("recusa o que não é YouTube", () => {
    assert.equal(extrairYoutube("https://vimeo.com/123"), null);
    assert.equal(extrairYoutube("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(extrairYoutube("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(extrairYoutube("texto solto"), null);
    assert.equal(extrairYoutube(""), null);
  });

  it("recusa id que não tem cara de id do YouTube", () => {
    assert.equal(extrairYoutube("https://www.youtube.com/watch?v=<script>alert(1)</script>"), null);
    assert.equal(extrairYoutube(`https://youtu.be/${"a".repeat(80)}`), null);
    assert.equal(extrairYoutube("https://www.youtube.com/watch"), null);
  });
});
