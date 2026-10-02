import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { partirEmLinks } from "../src/lib/links-chat";

describe("partirEmLinks", () => {
  it("texto sem link volta inteiro", () => {
    assert.deepEqual(partirEmLinks("oi pessoal"), [{ tipo: "texto", valor: "oi pessoal" }]);
  });

  it("separa o link do resto", () => {
    assert.deepEqual(partirEmLinks("veja https://exemplo.com/a?b=1 agora"), [
      { tipo: "texto", valor: "veja " },
      { tipo: "link", valor: "https://exemplo.com/a?b=1" },
      { tipo: "texto", valor: " agora" },
    ]);
  });

  it("pontuação no fim fica fora do link", () => {
    assert.deepEqual(partirEmLinks("olha https://exemplo.com/x."), [
      { tipo: "texto", valor: "olha " },
      { tipo: "link", valor: "https://exemplo.com/x" },
      { tipo: "texto", valor: "." },
    ]);
    assert.deepEqual(partirEmLinks("(https://exemplo.com)"), [
      { tipo: "texto", valor: "(" },
      { tipo: "link", valor: "https://exemplo.com" },
      { tipo: "texto", valor: ")" },
    ]);
  });

  it("só http e https viram link", () => {
    for (const perigoso of ["javascript:alert(1)", "data:text/html,x", "ftp://a.com", "file:///etc/passwd"]) {
      assert.ok(partirEmLinks(perigoso).every((p) => p.tipo === "texto"), perigoso);
    }
  });

  it("vários links na mesma mensagem", () => {
    const partes = partirEmLinks("http://a.com e https://b.com");
    assert.deepEqual(partes.filter((p) => p.tipo === "link").map((p) => p.valor), ["http://a.com", "https://b.com"]);
  });

  it("não perde nenhum caractere", () => {
    const original = "a https://x.com/y?z=1, b (https://w.org) c";
    assert.equal(partirEmLinks(original).map((p) => p.valor).join(""), original);
  });
});
