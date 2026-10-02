import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  anexarMensagens,
  MAX_MENSAGENS_NO_CLIENTE,
  mesclarHistorico,
  ultimasPendentes,
} from "../src/lib/historico-chat";
import type { ChatMessage } from "../src/lib/socket-events";

const msg = (id: number, de = "x", extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  de,
  nome: de,
  texto: `m${id}`,
  em: id,
  ...extra,
});

describe("anexarMensagens", () => {
  it("guarda só as últimas e mantém a ordem", () => {
    const muitas = Array.from({ length: MAX_MENSAGENS_NO_CLIENTE + 20 }, (_, i) => msg(i + 1));
    const lista = anexarMensagens([], muitas);
    assert.equal(lista.length, MAX_MENSAGENS_NO_CLIENTE);
    assert.equal(lista[0].id, 21);
    assert.equal(lista.at(-1)?.id, MAX_MENSAGENS_NO_CLIENTE + 20);
  });
});

describe("mesclarHistorico", () => {
  it("primeira entrada: todo o histórico entra, marcado como antigo", () => {
    const { lista, adicionadas } = mesclarHistorico([], [msg(1), msg(2)], { euAntigo: null, euNovo: "eu" });
    assert.equal(adicionadas, 2);
    assert.ok(lista.every((m) => m.antiga));
  });

  it("reconexão: só entra o que faltava, sem marcar como antigo (é o que perdi enquanto estava fora)", () => {
    const atual = [msg(1), msg(2)];
    const { lista, adicionadas } = mesclarHistorico(atual, [msg(1), msg(2), msg(3)], {
      euAntigo: "eu-antigo",
      euNovo: "eu-novo",
    });
    assert.equal(adicionadas, 1);
    assert.deepEqual(lista.map((m) => m.id), [1, 2, 3]);
    assert.equal(lista[2].antiga, undefined);
  });

  it("reconexão: minhas mensagens passam a ter o meu id novo", () => {
    const atual = [msg(1, "eu-antigo"), msg(2, "outro")];
    const { lista } = mesclarHistorico(atual, [msg(1, "eu-novo"), msg(2, "outro")], {
      euAntigo: "eu-antigo",
      euNovo: "eu-novo",
    });
    assert.equal(lista[0].de, "eu-novo");
    assert.equal(lista[1].de, "outro");
  });

  it("avisos locais (id negativo) não atrapalham o que já foi visto", () => {
    const atual = [msg(-1, "", { sistema: true }), msg(1)];
    const { lista, adicionadas } = mesclarHistorico(atual, [msg(1), msg(2)], {
      euAntigo: "a",
      euNovo: "b",
    });
    assert.equal(adicionadas, 1);
    assert.deepEqual(lista.map((m) => m.id), [-1, 1, 2]);
  });
});

describe("ultimasPendentes", () => {
  const lista = [msg(1), msg(2), msg(3), msg(4)];

  it("devolve só o fim da lista que ainda não foi visto", () => {
    assert.deepEqual(ultimasPendentes(lista, 10, 8).map((m) => m.id), [3, 4]);
  });

  it("nada pendente quando tudo foi visto", () => {
    assert.deepEqual(ultimasPendentes(lista, 10, 10), []);
  });

  it("se a lista foi cortada, não passa do que ela tem", () => {
    assert.deepEqual(ultimasPendentes(lista, 500, 0).map((m) => m.id), [1, 2, 3, 4]);
  });

  it("visto maior que o total (aba trocada antes) não quebra", () => {
    assert.deepEqual(ultimasPendentes(lista, 5, 9), []);
  });
});
