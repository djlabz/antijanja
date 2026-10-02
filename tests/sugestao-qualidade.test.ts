import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { espectadoresLimitados, sugerirReducao } from "../src/lib/sugestao-qualidade";

describe("sugerirReducao", () => {
  it("1080p/30/4 Mbps vai pra 720p com teto de 2 Mbps", () => {
    const s = sugerirReducao({ resolucao: "1080p", fps: 30, bitrateMbps: 4 });
    assert.deepEqual(s?.nova, { resolucao: "720p", fps: 30, bitrateMbps: 2 });
    assert.match(s?.resumo ?? "", /720p/);
  });

  it("nativa e sem limite também caem pra 720p/2 Mbps, e 60 fps vira 30", () => {
    assert.deepEqual(sugerirReducao({ resolucao: "nativa", fps: 60, bitrateMbps: null })?.nova, {
      resolucao: "720p",
      fps: 30,
      bitrateMbps: 2,
    });
  });

  it("já em 720p: 60 fps → 30", () => {
    assert.deepEqual(sugerirReducao({ resolucao: "720p", fps: 60, bitrateMbps: 2 })?.nova, {
      resolucao: "720p",
      fps: 30,
      bitrateMbps: 2,
    });
  });

  it("720p/30 com bitrate alto ou sem limite desce pra 2 Mbps; com 2 desce pra 1", () => {
    assert.equal(sugerirReducao({ resolucao: "720p", fps: 30, bitrateMbps: 6 })?.nova.bitrateMbps, 2);
    assert.equal(sugerirReducao({ resolucao: "720p", fps: 30, bitrateMbps: null })?.nova.bitrateMbps, 2);
    assert.equal(sugerirReducao({ resolucao: "720p", fps: 30, bitrateMbps: 2 })?.nova.bitrateMbps, 1);
  });

  it("no fundo da escada, tira fps; e depois não tem mais o que sugerir", () => {
    assert.deepEqual(sugerirReducao({ resolucao: "720p", fps: 30, bitrateMbps: 1 })?.nova, {
      resolucao: "720p",
      fps: 24,
      bitrateMbps: 1,
    });
    assert.deepEqual(sugerirReducao({ resolucao: "720p", fps: 24, bitrateMbps: 1 })?.nova.fps, 15);
    assert.equal(sugerirReducao({ resolucao: "720p", fps: 15, bitrateMbps: 1 }), null);
  });

  it("nunca sugere algo igual ou maior que o que já está", () => {
    const configs = [
      { resolucao: "1080p", fps: 60, bitrateMbps: 8 },
      { resolucao: "720p", fps: 24, bitrateMbps: 2 },
      { resolucao: "nativa", fps: 15, bitrateMbps: null },
    ] as const;
    for (const c of configs) {
      const nova = sugerirReducao({ ...c })?.nova;
      assert.ok(nova, JSON.stringify(c));
      assert.ok(nova.fps <= c.fps);
      assert.ok((nova.bitrateMbps ?? Infinity) <= (c.bitrateMbps ?? Infinity));
      assert.notDeepEqual(nova, c);
    }
  });
});

describe("espectadoresLimitados", () => {
  it("conta só quem está conectado e com o envio limitado por banda ou CPU", () => {
    assert.equal(
      espectadoresLimitados([
        { estado: "conectado", limite: "bandwidth" },
        { estado: "conectado", limite: "cpu" },
        { estado: "conectado", limite: "none" },
        { estado: "instavel", limite: "bandwidth" },
        { estado: "falhou", limite: "none" },
        { estado: "conectado", limite: "other" },
      ]),
      2
    );
  });
});
