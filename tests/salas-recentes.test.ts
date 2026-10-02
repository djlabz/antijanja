import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  descreverQuando,
  esquecerSala,
  lembrarSala,
  lerSalasRecentes,
  MAX_SALAS_RECENTES,
  VALIDADE_MS,
} from "../src/lib/salas-recentes";

const DIA = 24 * 60 * 60 * 1000;
const AGORA = 1_000_000_000_000;

describe("lembrarSala / lerSalasRecentes", () => {
  it("guarda a sala e devolve a mais recente primeiro", () => {
    let bruto: string | null = null;
    bruto = lembrarSala(bruto, "sala-a", AGORA - 2000);
    bruto = lembrarSala(bruto, "sala-b", AGORA - 1000);
    assert.deepEqual(lerSalasRecentes(bruto, AGORA).map((s) => s.codigo), ["sala-b", "sala-a"]);
  });

  it("entrar de novo na mesma sala só sobe ela pro topo (sem repetir)", () => {
    let bruto: string | null = null;
    bruto = lembrarSala(bruto, "sala-a", AGORA - 3000);
    bruto = lembrarSala(bruto, "sala-b", AGORA - 2000);
    bruto = lembrarSala(bruto, "sala-a", AGORA - 1000);
    assert.deepEqual(lerSalasRecentes(bruto, AGORA).map((s) => s.codigo), ["sala-a", "sala-b"]);
  });

  it(`guarda no máximo ${MAX_SALAS_RECENTES}, descartando as mais velhas`, () => {
    let bruto: string | null = null;
    for (let i = 0; i < MAX_SALAS_RECENTES + 3; i++) bruto = lembrarSala(bruto, `sala-${i}`, AGORA - 1000 + i);
    const salas = lerSalasRecentes(bruto, AGORA);
    assert.equal(salas.length, MAX_SALAS_RECENTES);
    assert.equal(salas[0].codigo, `sala-${MAX_SALAS_RECENTES + 2}`);
    assert.ok(!salas.some((s) => s.codigo === "sala-0"));
  });

  it("esquece salas com mais de 30 dias", () => {
    const bruto = lembrarSala(lembrarSala(null, "velha", AGORA - VALIDADE_MS - 1), "nova", AGORA - DIA);
    assert.deepEqual(lerSalasRecentes(bruto, AGORA).map((s) => s.codigo), ["nova"]);
  });
});

describe("esquecerSala", () => {
  it("tira só a sala pedida", () => {
    let bruto: string | null = lembrarSala(null, "a", AGORA - 2);
    bruto = lembrarSala(bruto, "b", AGORA - 1);
    assert.deepEqual(lerSalasRecentes(esquecerSala(bruto, "a", AGORA), AGORA).map((s) => s.codigo), ["b"]);
  });
});

describe("dado inválido no armazenamento", () => {
  it("não quebra com lixo, JSON torto ou formato errado", () => {
    for (const lixo of [null, "", "não é json", "{}", "123", '[1,2,3]', '[{"codigo":5,"em":"x"}]', '[{"codigo":"","em":1}]']) {
      assert.deepEqual(lerSalasRecentes(lixo, AGORA), [], String(lixo));
    }
  });

  it("aproveita as entradas boas e ignora as ruins", () => {
    const bruto = JSON.stringify([{ codigo: "boa", em: AGORA - 10 }, { codigo: 7 }, null]);
    assert.deepEqual(lerSalasRecentes(bruto, AGORA).map((s) => s.codigo), ["boa"]);
  });

  it("lembrar por cima de lixo recomeça limpo", () => {
    assert.deepEqual(lerSalasRecentes(lembrarSala("lixo", "a", AGORA), AGORA).map((s) => s.codigo), ["a"]);
  });
});

describe("descreverQuando", () => {
  it("fala em português natural", () => {
    assert.equal(descreverQuando(AGORA - 30_000, AGORA), "agora há pouco");
    assert.equal(descreverQuando(AGORA - 5 * 60_000, AGORA), "há 5 min");
    assert.equal(descreverQuando(AGORA - 2 * 60 * 60_000, AGORA), "há 2 h");
    assert.equal(descreverQuando(AGORA - 30 * 60 * 60_000, AGORA), "ontem");
    assert.equal(descreverQuando(AGORA - 3 * DIA, AGORA), "há 3 dias");
  });
});
