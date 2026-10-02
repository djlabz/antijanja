/**
 * Testes do módulo de conexões WebRTC com uma `RTCPeerConnection` falsa:
 * dá pra exercitar fila de sinais, roteamento por origem, ICE restart e
 * estados sem navegador nem rede (ADR 025).
 */
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { criarConexoes, type EstadoConexao } from "../src/lib/conexoes-webrtc";

type Dados = Record<string, unknown>;

class PcFalso {
  static todas: PcFalso[] = [];
  connectionState: RTCPeerConnectionState = "new";
  onconnectionstatechange: (() => void) | null = null;
  onicecandidate: ((e: { candidate: unknown }) => void) | null = null;
  ontrack: ((e: { streams: unknown[] }) => void) | null = null;
  remoteDescription: Dados | null = null;
  candidatos: unknown[] = [];
  ofertas: { iceRestart: boolean }[] = [];
  fechada = false;
  estatisticas = new Map<string, Dados>();

  constructor() {
    PcFalso.todas.push(this);
  }
  addTrack() {}
  getSenders() {
    return [];
  }
  async createOffer(opcoes?: { iceRestart?: boolean }) {
    const oferta = { type: "offer", sdp: "o", iceRestart: !!opcoes?.iceRestart };
    this.ofertas.push(oferta);
    return oferta;
  }
  async createAnswer() {
    return { type: "answer", sdp: "a" };
  }
  async setLocalDescription() {}
  async setRemoteDescription(descricao: Dados) {
    // Demora de propósito: é a janela em que o candidato antigo se perdia.
    await new Promise((ok) => setTimeout(ok, 15));
    if (descricao.ruim) throw new Error("sdp inválido");
    this.remoteDescription = descricao;
  }
  async addIceCandidate(candidato: unknown) {
    if (!this.remoteDescription) throw new Error("sem remoteDescription");
    this.candidatos.push(candidato);
  }
  async getStats() {
    return this.estatisticas;
  }
  close() {
    this.fechada = true;
  }
  mudarEstado(estado: RTCPeerConnectionState) {
    this.connectionState = estado;
    this.onconnectionstatechange?.();
  }
}

const stream = { getTracks: () => [{ kind: "video" }] } as unknown as MediaStream;
const esperar = (ms = 20) => new Promise((ok) => setTimeout(ok, ms));

function montar() {
  const sinais: { para: string; tipo: string; origem: string }[] = [];
  const estados: [string, EstadoConexao | null][] = [];
  const conexoes = criarConexoes({
    enviarSinal: (para, tipo, _dados, origem) => sinais.push({ para, tipo, origem }),
    obterStreamLocal: () => stream,
    obterBitrateMbps: () => 4,
    obterIceServers: () => [],
    aoReceberStream: () => {},
    aoMudarEstadoEntrada: (de, estado) => estados.push([de, estado]),
  });
  return { conexoes, sinais, estados };
}

beforeEach(() => {
  PcFalso.todas = [];
  (globalThis as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = PcFalso;
});

describe("fila de sinais", () => {
  it("o candidato que chega junto com a oferta não se perde", async () => {
    const { conexoes } = montar();
    const oferta = conexoes.tratarSinal("b", "offer", { type: "offer", sdp: "x" }, "saida");
    const candidato = conexoes.tratarSinal("b", "candidate", { c: 1 }, "saida");
    await Promise.all([oferta, candidato]);
    assert.equal(PcFalso.todas[0].candidatos.length, 1);
  });

  it("um sinal ruim não trava os seguintes", async () => {
    const { conexoes } = montar();
    await conexoes.tratarSinal("b", "offer", { ruim: true }, "saida");
    await conexoes.tratarSinal("b", "offer", { type: "offer", sdp: "ok" }, "saida");
    assert.ok(PcFalso.todas[0].remoteDescription);
  });
});

describe("roteamento por origem", () => {
  it("candidato da saída do outro vai pra minha entrada, e vice-versa", async () => {
    const { conexoes } = montar();
    await conexoes.ofertar("b"); // minha saída pro b → todas[0]
    await conexoes.tratarSinal("b", "answer", { type: "answer", sdp: "x" });
    await conexoes.tratarSinal("b", "offer", { type: "offer", sdp: "y" }); // minha entrada ← b → todas[1]
    const [saida, entrada] = PcFalso.todas;

    await conexoes.tratarSinal("b", "candidate", { n: "da-saida-dele" }, "saida");
    await conexoes.tratarSinal("b", "candidate", { n: "da-entrada-dele" }, "entrada");

    assert.deepEqual(entrada.candidatos, [{ n: "da-saida-dele" }]);
    assert.deepEqual(saida.candidatos, [{ n: "da-entrada-dele" }]);
  });
});

describe("ICE restart", () => {
  it("refaz o caminho quando a conexão falha, até 3 vezes", async () => {
    const { conexoes, sinais } = montar();
    await conexoes.ofertar("b");
    const saida = PcFalso.todas[0];

    for (let i = 0; i < 6; i++) {
      saida.mudarEstado("failed");
      await esperar(5);
    }

    assert.equal(saida.ofertas.filter((o) => o.iceRestart).length, 3);
    assert.equal(sinais.filter((s) => s.tipo === "offer").length, 4); // a inicial + 3
  });

  it("voltar a conectar zera a contagem", async () => {
    const { conexoes } = montar();
    await conexoes.ofertar("b");
    const saida = PcFalso.todas[0];
    for (let i = 0; i < 3; i++) {
      saida.mudarEstado("failed");
      await esperar(5);
    }
    saida.mudarEstado("connected");
    saida.mudarEstado("failed");
    await esperar(5);
    assert.equal(saida.ofertas.filter((o) => o.iceRestart).length, 4);
  });

  it("não reinicia uma conexão já fechada", async () => {
    const { conexoes } = montar();
    await conexoes.ofertar("b");
    const saida = PcFalso.todas[0];
    conexoes.esquecer("b");
    saida.mudarEstado("failed");
    await esperar(5);
    assert.equal(saida.ofertas.filter((o) => o.iceRestart).length, 0);
  });
});

describe("estado da conexão de entrada", () => {
  it("conectando → conectado → falhou → fechada", async () => {
    const { conexoes, estados } = montar();
    await conexoes.tratarSinal("b", "offer", { type: "offer", sdp: "x" });
    const entrada = PcFalso.todas[0];
    entrada.mudarEstado("connected");
    entrada.mudarEstado("failed");
    conexoes.fecharEntrada("b");
    assert.deepEqual(
      estados.map(([, e]) => e),
      ["conectando", "conectado", "falhou", null]
    );
  });
});

describe("saúde de quem transmite", () => {
  it("lista cada saída com estado e o limite do encoder", async () => {
    const { conexoes } = montar();
    await conexoes.ofertar("b");
    await conexoes.ofertar("c");
    const [pcB, pcC] = PcFalso.todas;
    pcB.mudarEstado("connected");
    pcB.estatisticas.set("x", {
      type: "outbound-rtp",
      kind: "video",
      qualityLimitationReason: "bandwidth",
      bytesSent: 1000,
      timestamp: 5,
      framesPerSecond: 20,
      frameHeight: 720,
    });
    pcC.mudarEstado("failed");

    const saude = await conexoes.saude();
    const b = saude.find((s) => s.id === "b");
    const c = saude.find((s) => s.id === "c");
    assert.equal(b?.estado, "conectado");
    assert.equal(b?.limite, "bandwidth");
    assert.equal(b?.bytes, 1000);
    assert.equal(b?.altura, 720);
    assert.equal(c?.estado, "falhou");
    assert.equal(c?.limite, "none");
  });
});
