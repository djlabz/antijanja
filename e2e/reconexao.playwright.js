// Reconexão de verdade (ADR 025 e 032).
// Deve dar: bannerReconectando 1, bannerDepois 0, duplicadas 0, minhaAlinhada e
// naoMinhaAlinhada true, `betoViuSaida` ["Ana saiu"], e `depois` com a mensagem
// "enquanto Ana estava fora" uma única vez.
// Por que fecha o WebSocket à mão: `setOffline` sozinho NÃO derruba o socket já
// aberto — o teste passaria sem nunca reconectar.
async (page) => {
  const browser = page.context().browser();
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  await A.addInitScript(() => {
    const O = window.WebSocket; window.__ws = [];
    window.WebSocket = new Proxy(O, { construct(t, a) { const w = new t(...a); window.__ws.push(w); return w; } });
  });
  const url = 'http://localhost:3000/sala/reconexao-' + Date.now().toString(36);
  const entrar = async (p, nome) => {
    await p.goto(url);
    await p.locator('#nome-convite').fill(nome);
    await p.locator('#nome-convite').press('Enter');
    await p.waitForSelector('[data-chat-input]');
  };
  const falar = async (p, t) => { const i = p.locator('[data-chat-input]:visible'); await i.fill(t); await i.press('Enter'); };
  const msgs = (p) => p.locator('[role=log] p').allInnerTexts();
  const r = {};
  await entrar(A, 'Ana'); await entrar(B, 'Beto');
  await falar(A, 'antes da queda'); await falar(B, 'oi da Beto');
  await A.waitForTimeout(500);

  await ctxA.setOffline(true);
  await A.evaluate(() => window.__ws.forEach(w => w.close()));
  await A.waitForTimeout(1500);
  r.bannerReconectando = await A.getByText('Reconectando').count();
  await falar(B, 'enquanto Ana estava fora');
  await B.waitForTimeout(500);
  r.betoViuSaida = (await msgs(B)).filter(t => /saiu|entrou/.test(t));

  await ctxA.setOffline(false);
  await A.waitForTimeout(10000);
  r.bannerDepois = await A.getByText('Reconectando').count();
  r.depois = await msgs(A);
  r.duplicadas = r.depois.length - new Set(r.depois).size;
  r.minhaAlinhada = await A.locator('[role=log] > div > div').filter({ hasText: 'antes da queda' }).first().evaluate(e => e.className.includes('items-end'));
  r.naoMinhaAlinhada = await A.locator('[role=log] > div > div').filter({ hasText: 'enquanto Ana estava fora' }).first().evaluate(e => e.className.includes('items-start'));
  await ctxA.close(); await ctxB.close();
  return r;
}
