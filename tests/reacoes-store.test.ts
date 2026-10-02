import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  criarReacoesStore,
  DURACAO_REACAO_MS,
  MAX_REACOES_NA_TELA,
} from "../src/lib/reacoes-store";

describe("reacoes-store", () => {
  it("adiciona, avisa quem assina e troca a referência da lista", () => {
    const store = criarReacoesStore(() => 50);
    let avisos = 0;
    store.assinar(() => avisos++);
    const antes = store.ler();
    store.adicionar("Ana", "🔥");
    assert.equal(avisos, 1);
    assert.notEqual(store.ler(), antes);
    assert.deepEqual(store.ler().map((r) => [r.nome, r.emoji, r.x]), [["Ana", "🔥", 50]]);
    store.limpar();
  });

  it("não deixa passar de 30 na tela", () => {
    const store = criarReacoesStore();
    for (let i = 0; i < MAX_REACOES_NA_TELA + 10; i++) store.adicionar("Ana", "👍");
    assert.equal(store.ler().length, MAX_REACOES_NA_TELA);
    store.limpar();
  });

  it("cada uma some sozinha depois do tempo", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const store = criarReacoesStore();
    store.adicionar("Ana", "😂");
    assert.equal(store.ler().length, 1);
    t.mock.timers.tick(DURACAO_REACAO_MS);
    assert.equal(store.ler().length, 0);
  });

  it("limpar cancela os timers e esvazia; quem desassinou não é mais avisado", (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const store = criarReacoesStore();
    let avisos = 0;
    const sair = store.assinar(() => avisos++);
    store.adicionar("Ana", "😂");
    sair();
    store.limpar();
    assert.equal(store.ler().length, 0);
    assert.equal(avisos, 1);
    t.mock.timers.tick(DURACAO_REACAO_MS * 2);
    assert.equal(avisos, 1);
  });
});
