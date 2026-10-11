/**
 * Testes de integração do servidor de sinalização: sobe só o Socket.IO (sem
 * Next) numa porta livre e conecta clientes de verdade. Rode com `npm test`.
 *
 * Cobrem o que já quebrou ou podia quebrar de forma silenciosa: payload
 * malformado derrubando o processo, reconexão sendo recusada por "nome em
 * uso" e sinais vazando entre salas (ADR 025).
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as criarCliente, type Socket } from "socket.io-client";
import type { EventosCliente, EventosServidor } from "../src/lib/socket-events";
import {
  lerIceServersDoAmbiente,
  lerLimitePorIpDoAmbiente,
  normalizarIp,
  registrarSinalizacao,
} from "../src/server/sinalizacao";
import { MAX_HISTORICO, registrarMensagem, historicoPara, entrarNaSala, sairDaSala } from "../src/server/rooms";

type Cliente = Socket<EventosServidor, EventosCliente>;
type RespostaEntrada = Parameters<Parameters<EventosCliente["sala:entrar"]>[1]>[0];

let http: HttpServer;
let url: string;
const abertos: Cliente[] = [];
let contador = 0;

/** Código de sala único por teste: as salas vivem num Map global do processo. */
const sala = () => `teste-${++contador}`;

before(async () => {
  http = createServer();
  registrarSinalizacao(new Server<EventosCliente, EventosServidor>(http), {
    log: () => {},
    limiteEntradasPorMinuto: 10_000, // o limite em si tem teste próprio, com servidor à parte
  });
  await new Promise<void>((ok) => http.listen(0, "127.0.0.1", ok));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

after(async () => {
  abertos.forEach((c) => c.disconnect());
  await new Promise((ok) => http.close(ok));
});

/** `ip` simula o endereço do cliente como um proxy o escreveria (`x-forwarded-for`). */
async function conectar(alvo = url, ip?: string): Promise<Cliente> {
  const cliente: Cliente = criarCliente(alvo, {
    transports: ["websocket"],
    forceNew: true,
    ...(ip ? { extraHeaders: { "x-forwarded-for": ip } } : {}),
  });
  abertos.push(cliente);
  await new Promise<void>((ok, erro) => {
    cliente.once("connect", ok);
    cliente.once("connect_error", erro);
  });
  return cliente;
}

function entrar(
  cliente: Cliente,
  codigo: string,
  nome: string,
  sessao = Math.random().toString(36)
): Promise<RespostaEntrada> {
  return new Promise((ok) => cliente.emit("sala:entrar", { codigo, nome, sessao }, ok));
}

/** Próxima ocorrência de um evento (ou rejeita depois de `ms`). */
function esperar<T>(cliente: Cliente, evento: string, ms = 1500): Promise<T> {
  return new Promise((ok, erro) => {
    const t = setTimeout(() => erro(new Error(`timeout esperando "${evento}"`)), ms);
    (cliente as Socket).once(evento, (valor: T) => {
      clearTimeout(t);
      ok(valor);
    });
  });
}

/** Tudo o que chegar do evento durante `ms` — pra provar que algo NÃO chegou. */
function coletar<T>(cliente: Cliente, evento: string, ms = 250): Promise<T[]> {
  return new Promise((ok) => {
    const lista: T[] = [];
    (cliente as Socket).on(evento, (valor: T) => lista.push(valor));
    setTimeout(() => ok(lista), ms);
  });
}

describe("payload malformado", () => {
  it("não derruba o servidor", async () => {
    const mau = await conectar();
    const cru = mau as Socket;
    cru.emit("sala:entrar", 1);
    cru.emit("sala:entrar", null, 42);
    cru.emit("sala:entrar", { codigo: 1, nome: {}, sessao: [] });
    cru.emit("sala:entrar", { codigo: "x".repeat(500), nome: "a", sessao: "s" }, () => {});
    cru.emit("chat:enviar", undefined);
    cru.emit("chat:enviar", { texto: 5 });
    cru.emit("webrtc:sinal", "oi");
    cru.emit("fonte:adicionar", 7);
    cru.emit("fonte:comando", { tipo: "carregar", youtubeId: { a: 1 } });
    cru.emit("evento:que-nao-existe", { qualquer: "coisa" });

    // Se algum handler tivesse estourado, o processo de teste já teria caído;
    // o servidor ainda precisa atender um cliente normal.
    const bom = await conectar();
    const resposta = await entrar(bom, sala(), "Ana");
    assert.equal(resposta.ok, true);
  });

  it("recusa código sem ack sem estourar", async () => {
    const mau = await conectar();
    (mau as Socket).emit("sala:entrar", { codigo: sala(), nome: "X", sessao: "s" });
    const bom = await conectar();
    assert.equal((await entrar(bom, sala(), "Y")).ok, true);
  });
});

describe("entrar na sala", () => {
  it("vê quem já estava e avisa quem estava", async () => {
    const codigo = sala();
    const ana = await conectar();
    await entrar(ana, codigo, "Ana");
    const chegou = esperar<{ nome: string }>(ana, "participante:entrou");

    const beto = await conectar();
    const resposta = await entrar(beto, codigo, "Beto");

    assert.ok(resposta.ok);
    assert.deepEqual(
      resposta.participantes.map((p) => p.nome),
      ["Ana"]
    );
    assert.equal((await chegou).nome, "Beto");
  });

  it("recusa nome repetido de outra pessoa", async () => {
    const codigo = sala();
    await entrar(await conectar(), codigo, "Ana");
    const resposta = await entrar(await conectar(), codigo, "ana");
    assert.equal(resposta.ok, false);
    assert.equal((resposta as { motivo?: string }).motivo, "nome-em-uso");
  });

  it("numera convidados", async () => {
    const codigo = sala();
    const um = await entrar(await conectar(), codigo, "");
    const dois = await entrar(await conectar(), codigo, "");
    assert.ok(um.ok && dois.ok);
    assert.equal(um.nome, "Convidado 1");
    assert.equal(dois.nome, "Convidado 2");
  });

  it("não deixa o mesmo socket entrar em duas salas", async () => {
    const c = await conectar();
    assert.equal((await entrar(c, sala(), "Ana")).ok, true);
    assert.equal((await entrar(c, sala(), "Ana")).ok, false);
  });
});

describe("reconexão (a mesma pessoa voltando)", () => {
  it("entra com o mesmo nome em vez de ser recusada", async () => {
    const codigo = sala();
    const antiga = await conectar();
    await entrar(antiga, codigo, "Ana", "sessao-ana");
    const idAntigo = antiga.id; // some quando o servidor derruba a conexão
    const beto = await conectar();
    await entrar(beto, codigo, "Beto");

    // O servidor ainda acha que a conexão antiga está viva (rede que caiu
    // sem fechar o socket) — a nova, com a mesma sessão, a substitui.
    const saiu = esperar<string>(beto, "participante:saiu");
    const entrou = esperar<{ nome: string }>(beto, "participante:entrou");
    const nova = await conectar();
    const resposta = await entrar(nova, codigo, "Ana", "sessao-ana");

    assert.ok(resposta.ok);
    assert.equal(resposta.nome, "Ana");
    assert.deepEqual(resposta.participantes.map((p) => p.nome), ["Beto"]);
    assert.equal(await saiu, idAntigo);
    assert.equal((await entrou).nome, "Ana");
  });

  it("derruba a conexão antiga", async () => {
    const codigo = sala();
    const antiga = await conectar();
    await entrar(antiga, codigo, "Ana", "s1");
    const caiu = esperar(antiga, "disconnect");
    await entrar(await conectar(), codigo, "Ana", "s1");
    await caiu;
    assert.equal(antiga.connected, false);
  });

  it("convidado volta com o mesmo nome", async () => {
    const codigo = sala();
    const primeira = await entrar(await conectar(), codigo, "", "s-convidado");
    const segunda = await entrar(await conectar(), codigo, "", "s-convidado");
    assert.ok(primeira.ok && segunda.ok);
    assert.equal(primeira.nome, "Convidado 1");
    assert.equal(segunda.nome, "Convidado 1");
  });

  it("sessão diferente com o mesmo nome continua recusada", async () => {
    const codigo = sala();
    await entrar(await conectar(), codigo, "Ana", "dona");
    assert.equal((await entrar(await conectar(), codigo, "Ana", "intrusa")).ok, false);
  });

  it("a sala sozinha sobrevive à troca (o vídeo do YouTube fica)", async () => {
    const codigo = sala();
    const antiga = await conectar();
    await entrar(antiga, codigo, "Ana", "s1");
    await new Promise<void>((ok) =>
      antiga.emit(
        "fonte:adicionar",
        { link: "https://youtu.be/dQw4w9WgXcQ", qualquerUmControla: false },
        () => ok()
      )
    );
    const resposta = await entrar(await conectar(), codigo, "Ana", "s1");
    assert.ok(resposta.ok);
    assert.equal(resposta.fonteVideo?.youtubeId, "dQw4w9WgXcQ");
    assert.equal(resposta.fonteVideo?.adicionadoPor, (resposta as { euId: string }).euId);
  });
});

describe("sinalização WebRTC", () => {
  it("entrega só dentro da mesma sala", async () => {
    const ana = await conectar();
    const beto = await conectar();
    const intruso = await conectar();
    await entrar(ana, sala(), "Ana");
    const respostaBeto = await entrar(beto, sala(), "Beto"); // outra sala
    assert.ok(respostaBeto.ok);
    const codigo = sala();
    await entrar(intruso, codigo, "Intruso");

    const recebidos = coletar(beto, "webrtc:sinal");
    (intruso as Socket).emit("webrtc:sinal", {
      para: beto.id,
      tipo: "offer",
      dados: { sdp: "x" },
    });
    assert.deepEqual(await recebidos, []);
  });

  it("entrega dentro da sala, com a origem", async () => {
    const codigo = sala();
    const ana = await conectar();
    const beto = await conectar();
    await entrar(ana, codigo, "Ana");
    await entrar(beto, codigo, "Beto");

    const chegou = esperar<{ de: string; tipo: string; origem?: string }>(beto, "webrtc:sinal");
    (ana as Socket).emit("webrtc:sinal", {
      para: beto.id,
      tipo: "candidate",
      dados: { candidate: "c" },
      origem: "saida",
    });
    const sinal = await chegou;
    assert.equal(sinal.de, ana.id);
    assert.equal(sinal.origem, "saida");
  });

  it("descarta tipo inválido", async () => {
    const codigo = sala();
    const ana = await conectar();
    const beto = await conectar();
    await entrar(ana, codigo, "Ana");
    await entrar(beto, codigo, "Beto");
    const recebidos = coletar(beto, "webrtc:sinal");
    (ana as Socket).emit("webrtc:sinal", { para: beto.id, tipo: "hack", dados: {} });
    assert.deepEqual(await recebidos, []);
  });
});

describe("chat e reações", () => {
  it("limita o spam de chat", async () => {
    const codigo = sala();
    const ana = await conectar();
    const beto = await conectar();
    await entrar(ana, codigo, "Ana");
    await entrar(beto, codigo, "Beto");
    const recebidas = coletar(beto, "chat:mensagem", 400);
    for (let i = 0; i < 30; i++) ana.emit("chat:enviar", { texto: `oi ${i}` });
    assert.equal((await recebidas).length, 8);
  });

  it("ignora emoji fora da lista", async () => {
    const codigo = sala();
    const ana = await conectar();
    await entrar(ana, codigo, "Ana");
    const recebidas = coletar(ana, "reacao:recebida");
    ana.emit("reacao:enviar", "💣");
    assert.deepEqual(await recebidas, []);
  });
});

describe("sala trancada", () => {
  it("recusa quem é novo, mas deixa voltar quem já era da sala", async () => {
    const codigo = sala();
    const ana = await conectar();
    await entrar(ana, codigo, "Ana", "sessao-ana");
    ana.emit("sala:trancar", true);
    await esperar(ana, "sala:trancada");

    const novo = await entrar(await conectar(), codigo, "Beto");
    assert.equal(novo.ok, false);
    assert.equal((novo as { motivo?: string }).motivo, "trancada");

    const voltando = await entrar(await conectar(), codigo, "Ana", "sessao-ana");
    assert.equal(voltando.ok, true);
    assert.equal((voltando as { trancada: boolean }).trancada, true);
  });

  it("avisa a sala toda ao trancar e ao destrancar, e volta a aceitar gente", async () => {
    const codigo = sala();
    const ana = await conectar();
    const beto = await conectar();
    await entrar(ana, codigo, "Ana");
    await entrar(beto, codigo, "Beto");

    const trancou = esperar<boolean>(beto, "sala:trancada");
    ana.emit("sala:trancar", true);
    assert.equal(await trancou, true);

    const destrancou = esperar<boolean>(beto, "sala:trancada");
    ana.emit("sala:trancar", false);
    assert.equal(await destrancou, false);

    assert.equal((await entrar(await conectar(), codigo, "Caio")).ok, true);
  });

  it("ignora valor que não é booleano e quem não está na sala", async () => {
    const codigo = sala();
    const ana = await conectar();
    await entrar(ana, codigo, "Ana");
    const avisos = coletar(ana, "sala:trancada");
    (ana as Socket).emit("sala:trancar", "sim");
    (await conectar()).emit("sala:trancar", true); // de fora da sala
    assert.deepEqual(await avisos, []);
    assert.equal((await entrar(await conectar(), codigo, "Beto")).ok, true);
  });
});

describe("limite de tentativas de entrar", () => {
  it("segura quem testa muitos códigos e deixa o resto passar", async () => {
    const httpLimitado = createServer();
    const ioLimitado = new Server<EventosCliente, EventosServidor>(httpLimitado);
    registrarSinalizacao(ioLimitado, { log: () => {}, limiteEntradasPorMinuto: 3 });
    await new Promise<void>((ok) => httpLimitado.listen(0, "127.0.0.1", ok));
    const urlLimitada = `http://127.0.0.1:${(httpLimitado.address() as AddressInfo).port}`;
    try {
      const respostas = [];
      for (let i = 0; i < 5; i++) {
        const c = await conectar(urlLimitada);
        respostas.push(await entrar(c, sala(), `Pessoa ${i}`));
      }
      assert.deepEqual(
        respostas.map((r) => r.ok),
        [true, true, true, false, false]
      );
      assert.equal((respostas[3] as { motivo?: string }).motivo, "limite");
    } finally {
      // `io.close()` derruba os sockets abertos e fecha o http junto; fechar só
      // o http ficaria esperando as conexões (e o teste pendurado pra sempre).
      await new Promise((ok) => void ioLimitado.close(ok));
    }
  });
});

describe("TURN configurável", () => {
  it("sem variáveis, não manda servidor extra", () => {
    assert.deepEqual(lerIceServersDoAmbiente({}), []);
  });

  it("lê várias URLs, usuário e senha", () => {
    assert.deepEqual(
      lerIceServersDoAmbiente({
        TURN_URL: "turn:a.exemplo.com:3478, turns:a.exemplo.com:5349",
        TURN_USERNAME: "u",
        TURN_CREDENTIAL: "s",
      }),
      [
        {
          urls: ["turn:a.exemplo.com:3478", "turns:a.exemplo.com:5349"],
          username: "u",
          credential: "s",
        },
      ]
    );
  });

  it("ignora URL que não é turn:/turns:", () => {
    assert.deepEqual(lerIceServersDoAmbiente({ TURN_URL: "http://x, javascript:1" }), []);
  });

  it("o ack da sala traz a lista (vazia por padrão)", async () => {
    const resposta = await entrar(await conectar(), sala(), "Ana");
    assert.ok(resposta.ok);
    assert.deepEqual(resposta.iceServers, []);
  });
});

describe("vídeo do YouTube", () => {
  async function comVideo() {
    const codigo = sala();
    const dona = await conectar();
    const outro = await conectar();
    await entrar(dona, codigo, "Dona");
    await entrar(outro, codigo, "Outro");
    const atualizada = esperar(outro, "fonte:atualizada");
    await new Promise<void>((ok) =>
      dona.emit(
        "fonte:adicionar",
        { link: "https://youtu.be/dQw4w9WgXcQ", qualquerUmControla: false },
        () => ok()
      )
    );
    await atualizada;
    return { dona, outro };
  }

  it("quem não controla não remove", async () => {
    const { dona, outro } = await comVideo();
    const mudancas = coletar(dona, "fonte:atualizada");
    outro.emit("fonte:remover");
    assert.deepEqual(await mudancas, []);
  });

  it("quem adicionou remove", async () => {
    const { dona, outro } = await comVideo();
    const removida = esperar(outro, "fonte:atualizada");
    dona.emit("fonte:remover");
    assert.equal(await removida, null);
  });

  it("recusa comando com id de vídeo malformado", async () => {
    const { dona, outro } = await comVideo();
    const comandos = coletar(outro, "fonte:comando");
    (dona as Socket).emit("fonte:comando", {
      tipo: "carregar",
      youtubeId: "<script>",
      ehPlaylist: false,
    });
    assert.deepEqual(await comandos, []);
  });

  it("repassa comando válido só com os campos conhecidos", async () => {
    const { dona, outro } = await comVideo();
    const chegou = esperar<Record<string, unknown>>(outro, "fonte:comando");
    (dona as Socket).emit("fonte:comando", { tipo: "tocar", emSegundos: 12, extra: "lixo" });
    const comando = await chegou;
    assert.equal(comando.tipo, "tocar");
    assert.equal(comando.emSegundos, 12);
    assert.equal("extra" in comando, false);
  });
});

describe("histórico do chat", () => {
  async function falar(cliente: Cliente, texto: string) {
    const chegou = esperar(cliente, "chat:mensagem");
    cliente.emit("chat:enviar", { texto });
    await chegou;
  }

  it("quem entra depois recebe o que já foi dito, em ordem e com id", async () => {
    const codigo = sala();
    const ana = await conectar();
    await entrar(ana, codigo, "Ana");
    await falar(ana, "oi");
    await falar(ana, "tudo bem?");

    const beto = await entrar(await conectar(), codigo, "Beto");
    assert.ok(beto.ok);
    const mensagens = (beto as { mensagens: { id: number; nome: string; texto: string }[] }).mensagens;
    assert.deepEqual(mensagens.map((m) => [m.nome, m.texto]), [["Ana", "oi"], ["Ana", "tudo bem?"]]);
    assert.ok(mensagens[1].id > mensagens[0].id);
  });

  it("quem volta de uma queda reconhece as próprias mensagens (de = novo id)", async () => {
    const codigo = sala();
    const ana = await conectar();
    await entrar(ana, codigo, "Ana", "sessao-ana");
    await falar(ana, "sou eu");
    const beto = await conectar();
    await entrar(beto, codigo, "Beto");
    await falar(beto, "e eu");

    const volta = await conectar();
    const resposta = await entrar(volta, codigo, "Ana", "sessao-ana");
    assert.ok(resposta.ok);
    const mensagens = (resposta as { mensagens: { de: string; texto: string }[] }).mensagens;
    assert.equal(mensagens.find((m) => m.texto === "sou eu")?.de, volta.id);
    assert.notEqual(mensagens.find((m) => m.texto === "e eu")?.de, volta.id);
  });

  it("sala vazia esquece o histórico", async () => {
    const codigo = sala();
    const ana = await conectar();
    await entrar(ana, codigo, "Ana");
    await falar(ana, "segredo");
    ana.disconnect();
    await new Promise((ok) => setTimeout(ok, 100));
    const nova = await entrar(await conectar(), codigo, "Beto");
    assert.deepEqual((nova as { mensagens: unknown[] }).mensagens, []);
  });
});

describe("rooms: histórico", () => {
  it(`guarda só as últimas ${MAX_HISTORICO}, com ids crescentes`, () => {
    const codigo = "historico-unit";
    entrarNaSala(codigo, "a", "Ana", "s-a");
    for (let i = 1; i <= MAX_HISTORICO + 5; i++) {
      registrarMensagem(codigo, "s-a", { de: "a", nome: "Ana", texto: `m${i}`, em: i });
    }
    const historico = historicoPara(codigo, "a", "s-a");
    assert.equal(historico.length, MAX_HISTORICO);
    assert.equal(historico[0].texto, "m6");
    assert.equal(historico.at(-1)?.texto, `m${MAX_HISTORICO + 5}`);
    assert.ok(historico.every((m, i) => i === 0 || m.id > historico[i - 1].id));
    sairDaSala(codigo, "a");
  });
});

describe("limite de participantes por IP", () => {
  let httpIp: HttpServer;
  let ioIp: Server<EventosCliente, EventosServidor>;
  let urlIp: string;

  async function subir(limite: number) {
    httpIp = createServer();
    ioIp = new Server<EventosCliente, EventosServidor>(httpIp);
    registrarSinalizacao(ioIp, {
      log: () => {},
      limiteEntradasPorMinuto: 10_000,
      limiteParticipantesPorIp: limite,
    });
    await new Promise<void>((ok) => httpIp.listen(0, "127.0.0.1", ok));
    urlIp = `http://127.0.0.1:${(httpIp.address() as AddressInfo).port}`;
  }
  async function derrubar() {
    // `io.close()` derruba os sockets abertos e fecha o http junto.
    await new Promise((ok) => void ioIp.close(ok));
  }

  it("recusa a segunda pessoa da mesma rede na mesma sala, e deixa outra rede entrar", async () => {
    await subir(1);
    try {
      const codigo = sala();
      const ana = await entrar(await conectar(urlIp, "203.0.113.7"), codigo, "Ana");
      assert.ok(ana.ok);
      const clone = await entrar(await conectar(urlIp, "203.0.113.7"), codigo, "Conta2");
      assert.equal(clone.ok, false);
      assert.equal((clone as { motivo?: string }).motivo, "ip-em-uso");
      const beto = await entrar(await conectar(urlIp, "198.51.100.9"), codigo, "Beto");
      assert.ok(beto.ok);
    } finally {
      await derrubar();
    }
  });

  it("quem volta de uma queda (mesma sessão) não conta contra si mesmo", async () => {
    await subir(1);
    try {
      const codigo = sala();
      await entrar(await conectar(urlIp, "203.0.113.7"), codigo, "Ana", "sessao-ana");
      const volta = await entrar(await conectar(urlIp, "203.0.113.7"), codigo, "Ana", "sessao-ana");
      assert.ok(volta.ok);
    } finally {
      await derrubar();
    }
  });

  it("o limite é por sala: a mesma rede entra em outra sala", async () => {
    await subir(1);
    try {
      await entrar(await conectar(urlIp, "203.0.113.7"), sala(), "Ana");
      const outra = await entrar(await conectar(urlIp, "203.0.113.7"), sala(), "Ana de novo");
      assert.ok(outra.ok);
    } finally {
      await derrubar();
    }
  });

  it("liberta a vaga quando a pessoa sai", async () => {
    await subir(1);
    try {
      const codigo = sala();
      const primeiro = await conectar(urlIp, "203.0.113.7");
      await entrar(primeiro, codigo, "Ana");
      primeiro.disconnect();
      await new Promise((ok) => setTimeout(ok, 150));
      const segundo = await entrar(await conectar(urlIp, "203.0.113.7"), codigo, "Ana2");
      assert.ok(segundo.ok);
    } finally {
      await derrubar();
    }
  });

  it("limite 2 deixa duas pessoas da mesma rede e recusa a terceira", async () => {
    await subir(2);
    try {
      const codigo = sala();
      const respostas = [];
      for (const nome of ["A", "B", "C"]) {
        respostas.push((await entrar(await conectar(urlIp, "203.0.113.7"), codigo, nome)).ok);
      }
      assert.deepEqual(respostas, [true, true, false]);
    } finally {
      await derrubar();
    }
  });

  it("sem limite (0), a mesma rede entra à vontade", async () => {
    await subir(0);
    try {
      const codigo = sala();
      for (const nome of ["A", "B", "C"]) {
        assert.ok((await entrar(await conectar(urlIp, "203.0.113.7"), codigo, nome)).ok);
      }
    } finally {
      await derrubar();
    }
  });
});

describe("normalizarIp", () => {
  it("IPv4 fica como está; IPv4 embutido em IPv6 vira IPv4", () => {
    assert.equal(normalizarIp("203.0.113.7"), "203.0.113.7");
    assert.equal(normalizarIp("::ffff:203.0.113.7"), "203.0.113.7");
  });

  it("IPv6 vale pela rede (/64): endereços da mesma casa dão o mesmo valor", () => {
    const a = normalizarIp("2001:db8:abcd:12:aaaa:bbbb:cccc:dddd");
    const b = normalizarIp("2001:0db8:ABCD:0012:1:2:3:4");
    assert.equal(a, b);
    assert.notEqual(a, normalizarIp("2001:db8:abcd:13::1"));
  });

  it("aceita a forma abreviada (::) e a zona (%eth0)", () => {
    assert.equal(normalizarIp("2001:db8::1"), normalizarIp("2001:db8:0:0:5::9"));
    assert.equal(normalizarIp("fe80::1%eth0"), normalizarIp("fe80::2"));
  });

  it("não quebra com lixo", () => {
    assert.equal(normalizarIp(""), "");
    assert.equal(typeof normalizarIp("???"), "string");
  });
});

describe("lerLimitePorIpDoAmbiente", () => {
  it("lê um número inteiro, e qualquer outra coisa vira 0 (sem limite)", () => {
    assert.equal(lerLimitePorIpDoAmbiente({ MAX_PARTICIPANTES_POR_IP: "1" }), 1);
    assert.equal(lerLimitePorIpDoAmbiente({ MAX_PARTICIPANTES_POR_IP: " 3 " }), 3);
    for (const ruim of [undefined, "", "0", "-1", "abc", "1.5"]) {
      assert.equal(lerLimitePorIpDoAmbiente({ MAX_PARTICIPANTES_POR_IP: ruim }), 0, String(ruim));
    }
  });
});

