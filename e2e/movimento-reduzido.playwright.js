// prefers-reduced-motion (ADR 035): compara o que anima com e sem a preferência.
// Deve dar, com "reduce": reação em `reacao-fade` por ~1.8s (aparece e some, sem
// subir), poeira sem animação, ícone girando/pulsando/pingando com 0.01ms (parado),
// transição do painel da sala de 0.01ms. Sem preferência: `reacao-sobe` 2.5s etc.
async (page) => {
  const browser = page.context().browser();
  const medir = async (reducedMotion) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion });
    const p = await ctx.newPage();
    await p.goto('http://localhost:3000/');
    const poeira = await p.locator('.campo-poeira').first().evaluate(e => getComputedStyle(e).animationName);
    await p.goto('http://localhost:3000/sala/movimento-' + Date.now().toString(36));
    await p.locator('#nome-convite').fill('Ana'); await p.locator('#nome-convite').press('Enter');
    await p.waitForSelector('[data-chat-input]'); await p.waitForTimeout(1200);
    await p.getByRole('button', { name: 'Reações' }).click();
    await p.getByRole('button', { name: /Reagir com/ }).first().click();
    await p.waitForSelector('.reacao-flutuante');
    const reacao = await p.locator('.reacao-flutuante').first().evaluate(e => { const c = getComputedStyle(e); return { nome: c.animationName, duracao: c.animationDuration }; });
    const painel = await p.locator('div[class*="md:grid"]').first().evaluate(e => getComputedStyle(e).transitionDuration);
    const pulso = await p.locator('.animate-pulse, .animate-ping, .animate-spin').first().evaluate(e => getComputedStyle(e).animationDuration).catch(() => null);
    await ctx.close();
    return { poeira, reacao, painel, pulso };
  };
  return { reduce: await medir('reduce'), normal: await medir('no-preference') };
}
