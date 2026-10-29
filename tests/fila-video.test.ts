import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  acabouODoItem,
  adicionarNaFila,
  aplicarAcaoNaFila,
  criarFonte,
  MAX_FILA,
} from "../src/lib/fila-video";
import type { FonteVideo, ItemFila } from "../src/lib/socket-events";

const item = (id: number, youtubeId = `video${id}`): ItemFila => ({
  id,
  youtubeId,
  ehPlaylist: false,
  por: "Ana",
});

/** Tocando o 1, esperando 2, 3 e 4. */
function comFila(): FonteVideo {
  let fonte = criarFonte(item(1), "dona", false);
  for (const id of [2, 3, 4]) fonte = adicionarNaFila(fonte, item(id))!;
  return fonte;
}

const ids = (fonte: FonteVideo) => fonte.proximos.map((i) => i.id);

describe("fila do vídeo", () => {
  it("começa só com o que está tocando", () => {
    const fonte = criarFonte(item(1), "dona", true);
    assert.equal(fonte.atual.id, 1);
    assert.deepEqual(fonte.proximos, []);
    assert.equal(fonte.qualquerUmControla, true);
  });

  it("adicionar põe no fim e não mexe na fonte original", () => {
    const antes = comFila();
    const depois = adicionarNaFila(antes, item(5))!;
    assert.deepEqual(ids(depois), [2, 3, 4, 5]);
    assert.deepEqual(ids(antes), [2, 3, 4]);
  });

  it("o mesmo vídeo pode entrar duas vezes (itens diferentes)", () => {
    const fonte = adicionarNaFila(criarFonte(item(1, "abc"), "dona", false), item(2, "abc"))!;
    assert.equal(fonte.atual.youtubeId, fonte.proximos[0].youtubeId);
    assert.notEqual(fonte.atual.id, fonte.proximos[0].id);
  });

  it("recusa passar do limite da fila", () => {
    let fonte = criarFonte(item(0), "dona", false);
    for (let i = 1; i <= MAX_FILA; i++) fonte = adicionarNaFila(fonte, item(i))!;
    assert.equal(fonte.proximos.length, MAX_FILA);
    assert.equal(adicionarNaFila(fonte, item(999)), null);
  });

  describe("avançar", () => {
    it("o próximo vira o atual e o que tocou sai da fila", () => {
      const fonte = aplicarAcaoNaFila(comFila(), "avancar", 1)!;
      assert.equal(fonte.atual.id, 2);
      assert.deepEqual(ids(fonte), [3, 4]);
    });

    it("citar um item que já não está tocando não faz nada (dois controladores, um pulo só)", () => {
      const umPulo = aplicarAcaoNaFila(comFila(), "avancar", 1)!;
      assert.equal(aplicarAcaoNaFila(umPulo, "avancar", 1), null);
      assert.equal(umPulo.atual.id, 2);
    });

    it("no último vídeo não faz nada", () => {
      const fonte = criarFonte(item(1), "dona", false);
      assert.equal(aplicarAcaoNaFila(fonte, "avancar", 1), null);
    });
  });

  describe("tocar agora", () => {
    it("o escolhido vira o atual, o atual sai e os outros ficam na ordem", () => {
      const fonte = aplicarAcaoNaFila(comFila(), "tocar", 3)!;
      assert.equal(fonte.atual.id, 3);
      assert.deepEqual(ids(fonte), [2, 4]);
    });

    it("ignora item que não está na fila (inclusive o que já toca)", () => {
      assert.equal(aplicarAcaoNaFila(comFila(), "tocar", 99), null);
      assert.equal(aplicarAcaoNaFila(comFila(), "tocar", 1), null);
    });
  });

  describe("priorizar", () => {
    it("põe o item como o próximo", () => {
      const fonte = aplicarAcaoNaFila(comFila(), "priorizar", 4)!;
      assert.deepEqual(ids(fonte), [4, 2, 3]);
      assert.equal(fonte.atual.id, 1);
    });

    it("quem já é o próximo, ou não existe, não muda nada", () => {
      assert.equal(aplicarAcaoNaFila(comFila(), "priorizar", 2), null);
      assert.equal(aplicarAcaoNaFila(comFila(), "priorizar", 99), null);
    });
  });

  describe("remover", () => {
    it("tira só aquele item", () => {
      const fonte = aplicarAcaoNaFila(comFila(), "remover", 3)!;
      assert.deepEqual(ids(fonte), [2, 4]);
      assert.equal(fonte.atual.id, 1);
    });

    it("não remove o que está tocando nem o que não existe", () => {
      assert.equal(aplicarAcaoNaFila(comFila(), "remover", 1), null);
      assert.equal(aplicarAcaoNaFila(comFila(), "remover", 99), null);
    });
  });

  describe("acabouODoItem", () => {
    it("vídeo solto: terminou é terminou", () => {
      assert.equal(acabouODoItem(false, null, -1), true);
    });

    it("playlist só acaba no último vídeo dela", () => {
      const lista = ["a", "b", "c"];
      assert.equal(acabouODoItem(true, lista, 0), false);
      assert.equal(acabouODoItem(true, lista, 1), false);
      assert.equal(acabouODoItem(true, lista, 2), true);
    });

    it("sem a playlist carregada, na dúvida não avança", () => {
      assert.equal(acabouODoItem(true, null, 0), false);
      assert.equal(acabouODoItem(true, undefined, 0), false);
      assert.equal(acabouODoItem(true, [], 0), false);
    });
  });

  it("nenhuma ação altera a fonte recebida", () => {
    const original = comFila();
    const copia = JSON.stringify(original);
    for (const acao of ["avancar", "tocar", "priorizar", "remover"] as const) {
      aplicarAcaoNaFila(original, acao, acao === "avancar" ? 1 : 3);
    }
    assert.equal(JSON.stringify(original), copia);
  });
});
