// Sugestão de baixar a qualidade (ADR 035). Simula o sinal que o navegador dá
// quando o upload não dá conta (`qualityLimitationReason: "bandwidth"`) — dá
// pra provocar uma rede ruim de verdade só com ferramentas de rede do sistema.
// Deve dar: antes null; aviso com "1 pessoa", "720p, 30 fps, até 2 Mbps" e os
// botões "Reduzir agora"/"Agora não"; depois de aceitar o aviso some e a config
// salva fica 720p/30/2; sem novo aviso logo em seguida (espera de 3 min).
// Troque MODO por "dispensar" pra testar o "Agora não".
async (page) => {
  const MODO = 'aceitar';
  const browser = page.context().browser();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const A = await ctxA.newPage();
  const B = await (await browser.newContext()).newPage();
  await A.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement('canvas'); c.width = 640; c.height = 360;
      const g = c.getContext('2d'); setInterval(() => { g.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); g.fillRect(0, 0, 640, 360); }, 100);
      return c.captureStream(15);
    };
    const orig = RTCPeerConnection.prototype.getStats;
    RTCPeerConnection.prototype.getStats = async function (...a) {
      const rep = await orig.apply(this, a); const m = new Map();
      rep.forEach((v, k) => m.set(k, v.type === 'outbound-rtp' && v.kind === 'video' ? { ...v, qualityLimitationReason: window.__limite || 'none' } : v));
      return m;
    };
  });
  const url = 'http://localhost:3000/sala/sugestao-' + Date.now().toString(36);
  for (const [p, n] of [[A, 'Ana'], [B, 'Beto']]) {
    await p.goto(url); await p.locator('#nome-convite').fill(n); await p.locator('#nome-convite').press('Enter'); await p.waitForSelector('[data-chat-input]');
  }
  await A.evaluate(() => localStorage.removeItem('tela-junto:config-transmissao'));
  await A.getByRole('button', { name: 'Compartilhar tela' }).first().click();
  await A.waitForTimeout(4000);
  const aviso = () => A.getByText('Reduzir agora').count();
  const r = { antes: await aviso() };

  await A.evaluate(() => { window.__limite = 'bandwidth'; });
  await A.waitForTimeout(5000);
  r.aposDuasLeituras = await aviso();            // ainda não: precisa de 3 seguidas
  await A.waitForTimeout(5000);
  r.aviso = await aviso();
  r.texto = r.aviso ? await A.locator('[role=status]').filter({ hasText: 'Reduzir agora' }).innerText() : null;

  if (MODO === 'aceitar') {
    await A.getByRole('button', { name: 'Reduzir agora' }).click();
    await A.waitForTimeout(1000);
    r.depoisDeAceitar = await aviso();
    r.config = await A.evaluate(() => JSON.parse(localStorage.getItem('tela-junto:config-transmissao')).state);
    await A.waitForTimeout(8000);
    r.semNovoAviso = (await aviso()) === 0;
  } else {
    await A.getByRole('button', { name: 'Agora não' }).click();
    await A.waitForTimeout(8000);
    r.semNovoAvisoAposDispensar = (await aviso()) === 0;
  }
  await A.evaluate(() => { window.__limite = 'none'; });
  await ctxA.close();
  return r;
}
