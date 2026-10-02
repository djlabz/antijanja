// Chat sem conexão com a sala (ADR 034): o campo vira só leitura e o botão de
// enviar desliga; ao reconectar volta ao normal e a mensagem sai.
// Deve dar: conectado.readOnly false; offline.readOnly true, placeholder
// "Conectando…", enviarDesabilitado true; depois.readOnly false e `mensagens`
// sem nada enviado durante a queda; `apos` com "agora sim".
async (page) => {
  const browser = page.context().browser();
  const ctxA = await browser.newContext();
  const A = await ctxA.newPage();
  await A.addInitScript(() => {
    const O = window.WebSocket; window.__ws = [];
    window.WebSocket = new Proxy(O, { construct(t, a) { const w = new t(...a); window.__ws.push(w); return w; } });
  });
  const url = 'http://localhost:3000/sala/pausa-' + Date.now().toString(36);
  await A.goto(url);
  await A.locator('#nome-convite').fill('Ana'); await A.locator('#nome-convite').press('Enter');
  await A.waitForSelector('[data-chat-input]');
  await A.waitForTimeout(1500);
  const campo = A.locator('[data-chat-input]:visible');
  const r = {};
  r.conectado = { readOnly: await campo.evaluate(e => e.readOnly), placeholder: await campo.getAttribute('placeholder') };

  await ctxA.setOffline(true);
  await A.evaluate(() => window.__ws.forEach(w => w.close()));
  await A.waitForTimeout(1500);
  r.offline = {
    readOnly: await campo.evaluate(e => e.readOnly),
    placeholder: await campo.getAttribute('placeholder'),
    enviarDesabilitado: await A.getByRole('button', { name: 'Enviar mensagem' }).isDisabled(),
  };
  // Força o envio mesmo assim: a guarda do hook também tem que segurar.
  await campo.evaluate(e => { e.removeAttribute('readonly'); });
  await campo.press('Enter');

  await ctxA.setOffline(false);
  await A.waitForTimeout(8000);
  r.depois = {
    readOnly: await campo.evaluate(e => e.readOnly),
    placeholder: await campo.getAttribute('placeholder'),
    mensagens: await A.locator('[role=log] p').allInnerTexts(),
  };
  await campo.fill('agora sim'); await campo.press('Enter'); await A.waitForTimeout(600);
  r.apos = await A.locator('[role=log] p').allInnerTexts();
  await ctxA.close();
  return r;
}
