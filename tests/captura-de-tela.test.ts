import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diagnosticarCaptura, explicarErroDeCaptura } from "../src/lib/captura-de-tela";

describe("diagnosticarCaptura", () => {
  it("ok quando o navegador tem getDisplayMedia", () => {
    assert.equal(
      diagnosticarCaptura({ mediaDevices: { getDisplayMedia() {} }, isSecureContext: true }),
      "ok"
    );
  });

  it("inseguro quando está em http (mediaDevices nem existe)", () => {
    assert.equal(diagnosticarCaptura({ mediaDevices: undefined, isSecureContext: false }), "inseguro");
  });

  it("sem suporte no celular: contexto seguro, mas sem getDisplayMedia", () => {
    assert.equal(diagnosticarCaptura({ mediaDevices: {}, isSecureContext: true }), "sem-suporte");
    assert.equal(diagnosticarCaptura({ mediaDevices: null, isSecureContext: true }), "sem-suporte");
  });

  it("sem suporte quando não dá pra saber (servidor)", () => {
    assert.equal(diagnosticarCaptura({}), "sem-suporte");
  });
});

describe("explicarErroDeCaptura", () => {
  const erro = (name: string, message = "") => Object.assign(new Error(message), { name });

  it("cancelar o seletor não é erro: não avisa nada", () => {
    assert.equal(explicarErroDeCaptura(erro("AbortError")), null);
    assert.equal(explicarErroDeCaptura(erro("NotAllowedError", "Permission denied")), null);
  });

  it("bloqueio do sistema é dito, porque cancelar não resolve", () => {
    assert.match(
      explicarErroDeCaptura(erro("NotAllowedError", "Permission denied by system")) ?? "",
      /sistema bloqueou/
    );
  });

  it("explica o que deu errado nos outros casos", () => {
    assert.match(explicarErroDeCaptura(erro("NotReadableError")) ?? "", /outro programa/);
    assert.match(explicarErroDeCaptura(erro("NotFoundError")) ?? "", /nenhuma tela/);
    assert.match(explicarErroDeCaptura(erro("SecurityError")) ?? "", /bloqueou/);
  });

  it("erro desconhecido (inclusive TypeError) ainda avisa", () => {
    assert.match(explicarErroDeCaptura(new TypeError("x is not a function")) ?? "", /Recarregue/);
    assert.match(explicarErroDeCaptura(undefined) ?? "", /Recarregue/);
  });
});
