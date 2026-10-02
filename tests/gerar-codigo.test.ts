import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gerarCodigoDeSala, normalizarCodigo } from "../src/lib/gerar-codigo";

describe("normalizarCodigo", () => {
  it("deixa minúsculo e sem acento", () => {
    assert.equal(normalizarCodigo("Sala do João"), "sala-do-joao");
  });

  it("tira o que quebraria a URL", () => {
    assert.equal(normalizarCodigo("a/b"), "a-b");
    assert.equal(normalizarCodigo("oi?x=1#y"), "oi-x-1-y");
    assert.equal(normalizarCodigo("../../etc"), "etc");
  });

  it("não deixa hífen sobrando nas pontas nem repetido", () => {
    assert.equal(normalizarCodigo("--a   b--"), "a-b");
  });

  it("devolve vazio quando não sobra nada (a home gera um código)", () => {
    assert.equal(normalizarCodigo("???"), "");
    assert.equal(normalizarCodigo(""), "");
  });

  it("respeita o limite de 20 caracteres do campo", () => {
    assert.ok(normalizarCodigo("x".repeat(50)).length <= 20);
  });

  it("não mexe num código já gerado", () => {
    const codigo = gerarCodigoDeSala();
    assert.equal(normalizarCodigo(codigo), codigo);
  });
});

describe("gerarCodigoDeSala", () => {
  it("usa só caracteres sem ambiguidade e o tamanho pedido", () => {
    for (let i = 0; i < 200; i++) {
      assert.match(gerarCodigoDeSala(), /^[abcdefghjkmnpqrstuvwxyz23456789]+$/);
    }
    assert.equal(gerarCodigoDeSala(12).length, 12);
  });

  it("gera 8 caracteres por padrão e não repete (é sorteio de verdade)", () => {
    assert.equal(gerarCodigoDeSala().length, 8);
    const vistos = new Set(Array.from({ length: 500 }, () => gerarCodigoDeSala()));
    assert.equal(vistos.size, 500);
  });
});
