// Responder mensagem no chat (ADR 038). Precisa de um servidor LOCAL (`npm run dev`,
// porta 3000 — troque BASE se o Next subiu em outra) e nada de internet.
// Roda no Playwright MCP (`browser_run_code_unsafe` com `filename`) ou adaptado.
// O que deve dar (r.*):
//   botaoSoNoHover        o botão de responder existe mas está invisível sem o mouse em cima
//   barraAoResponder      "Respondendo a Ana" com o trecho, e o campo com foco
//   citacaoNoBeto/NaAna   a citação aparece pros dois; pra Ana (dona da original) o autor é "Você"
//   barraSumiuAoEnviar    true
//   pulouAteOriginal      true: a original estava fora da tela, tocar na citação rola até ela
//   realceAplicado        true, e some sozinho (realceSumiu)
//   esc / cancelar        a barra some pelos dois caminhos
//   semBotaoNoAviso       avisos do sistema ("entrou") não têm botão de responder
async (page) => {
  const BASE = 'http://localhost:3000';
  const FOTOS = ''; // pasta pra salvar capturas de tela (vazio = não salva)
  const browser = page.context().browser();
  const url = BASE + '/sala/resp-' + Date.now().toString(36);
  const entrar = async (nome, viewport = { width: 1280, height: 800 }) => {
    const ctx = await browser.newContext({ viewport });
    const p = await ctx.newPage();
    await p.goto(url);
    await p.locator('#nome-convite').fill(nome);
    await p.locator('#nome-convite').press('Enter');
    await p.waitForSelector('[data-chat-input]');
    return { ctx, p };
  };
  const falar = async (p, texto) => {
    await p.locator('[data-chat-input]').first().fill(texto);
    await p.locator('[data-chat-input]').first().press('Enter');
  };
  const msg = (p, trecho) => p.locator('[data-mensagem-id]').filter({ hasText: trecho }).first();
  const barra = (p) => p.getByRole('group', { name: 'Respondendo a uma mensagem' });
  const r = {};

  const ana = await entrar('Ana');
  const beto = await entrar('Beto');

  // Duas mensagens da Ana, depois bastante conversa pra empurrar a primeira pra fora da tela.
  await falar(ana.p, 'Vamos ver o filme hoje?');
  await falar(ana.p, 'E pizza?');
  for (let i = 0; i < 24; i++) {
    await ana.p.waitForTimeout(200);
    await falar(ana.p, `enchendo linguiça ${i}`);
  }
  await beto.p.waitForFunction(() => document.body.innerText.includes('enchendo linguiça 23'));

  // O botão só aparece com o mouse em cima.
  const botaoFilme = beto.p.getByRole('button', { name: 'Responder a Ana' });
  const ultimo = botaoFilme.last();
  r.botaoSoNoHover = {
    semMouse: await ultimo.evaluate((b) => getComputedStyle(b).opacity),
    existe: (await botaoFilme.count()) > 0,
  };
  // A original está lá em cima, fora da tela: sobe até ela pra responder (como a pessoa faria).
  await beto.p.locator('[role=log]').evaluate((l) => (l.scrollTop = 0));
  const original = msg(beto.p, 'Vamos ver o filme');
  await original.hover();
  r.botaoSoNoHover.comMouse = await original
    .locator('xpath=ancestor::div[contains(@class,"group/msg")]//button[@aria-label="Responder a Ana"]')
    .evaluate((b) => getComputedStyle(b).opacity);
  await original
    .locator('xpath=ancestor::div[contains(@class,"group/msg")]//button[@aria-label="Responder a Ana"]')
    .click();

  r.barraAoResponder = {
    texto: (await barra(beto.p).innerText()).replace(/\s+/g, ' ').trim(),
    campoComFoco: await beto.p.evaluate(() => document.activeElement?.hasAttribute('data-chat-input')),
  };
  if (FOTOS) await beto.p.screenshot({ path: FOTOS + '/responder-barra.png' });

  await falar(beto.p, 'Bora! Mas pizza também');
  await beto.p.waitForTimeout(400);
  r.barraSumiuAoEnviar = (await barra(beto.p).count()) === 0;

  // A citação chega pros dois.
  await ana.p.waitForFunction(() => document.body.innerText.includes('Bora! Mas pizza também'));
  const citBeto = beto.p.getByRole('button', { name: /Ir para a mensagem de/ }).last();
  const citAna = ana.p.getByRole('button', { name: /Ir para a mensagem de/ }).last();
  r.citacaoNoBeto = (await citBeto.innerText()).replace(/\s+/g, ' ').trim();
  r.citacaoNaAna = (await citAna.innerText()).replace(/\s+/g, ' ').trim();

  // Tocar na citação leva até a original (que estava fora da tela) e a realça.
  const lista = ana.p.locator('[role=log]');
  await lista.evaluate((l) => (l.scrollTop = l.scrollHeight));
  const dentroDaTela = () =>
    ana.p.evaluate(() => {
      const l = document.querySelector('[role=log]');
      const m = [...document.querySelectorAll('[data-mensagem-id]')].find((e) => e.innerText.includes('Vamos ver o filme'));
      const a = m.getBoundingClientRect();
      const b = l.getBoundingClientRect();
      return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
    });
  const antes = await dentroDaTela();
  await citAna.click();
  await ana.p.waitForTimeout(900);
  r.pulouAteOriginal = !antes && (await dentroDaTela());
  r.realceAplicado = await msg(ana.p, 'Vamos ver o filme').evaluate((e) => /bg-primary\/35/.test(e.className));
  if (FOTOS) await ana.p.screenshot({ path: FOTOS + '/responder-citacao.png' });
  await ana.p.waitForTimeout(1800);
  r.realceSumiu = await msg(ana.p, 'Vamos ver o filme').evaluate((e) => !/bg-primary\/35/.test(e.className));

  // Cancelar: Esc no campo e o botão X.
  const responderPizza = async () => {
    const m = msg(beto.p, 'E pizza?');
    await m.scrollIntoViewIfNeeded();
    await m.hover();
    await m
      .locator('xpath=ancestor::div[contains(@class,"group/msg")]//button[@aria-label="Responder a Ana"]')
      .click();
  };
  await responderPizza();
  const abriu = (await barra(beto.p).count()) === 1;
  await beto.p.locator('[data-chat-input]').first().press('Escape');
  r.esc = { abriu, fechou: (await barra(beto.p).count()) === 0 };
  await responderPizza();
  await beto.p.getByRole('button', { name: 'Cancelar resposta' }).click();
  r.cancelar = { fechou: (await barra(beto.p).count()) === 0 };

  // Aviso do sistema não tem botão.
  r.semBotaoNoAviso = await beto.p.evaluate(
    () =>
      ![...document.querySelectorAll('[role=log] p')]
        .filter((p) => /entrou|saiu/.test(p.innerText))
        .some((p) => p.parentElement.querySelector('button'))
  );

  await ana.ctx.close();
  await beto.ctx.close();
  return r;
}
