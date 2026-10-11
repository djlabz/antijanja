// Limite por IP (ADR 036). Precisa de um servidor LOCAL com o limite ligado:
//   MAX_PARTICIPANTES_POR_IP=1 PORT=3001 npx tsx server.ts
// (os contextos do Playwright saem todos de 127.0.0.1, ou seja, "a mesma rede").
// Deve dar: anaEntrou 1; segundoErro "Esta sala aceita só uma pessoa por rede…";
// segundoTexto 1 ("feche a outra aba"); anaAposReload sem erro (a nova tentativa
// automática cobre a corrida do reload); e Conta2 entra depois que a Ana sai.
async (page) => {
  const browser = page.context().browser();
  const url = 'http://localhost:3001/sala/ip-' + Date.now().toString(36);
  const nova = async (nome) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(url);
    await p.locator('#nome-convite').fill(nome); await p.locator('#nome-convite').press('Enter');
    return { ctx, p };
  };
  const r = {};
  const A = await nova('Ana');
  await A.p.waitForSelector('[data-chat-input]'); await A.p.waitForTimeout(800);
  r.anaEntrou = await A.p.locator('aside li').count();

  const B = await nova('Conta2');
  await B.p.waitForTimeout(6000);
  r.segundoErro = await B.p.locator('p.text-destructive').innerText().catch(() => null);
  r.segundoTexto = await B.p.getByText('feche a outra aba').count();

  await A.p.reload();
  await A.p.waitForSelector('[data-chat-input]', { timeout: 15000 });
  await A.p.waitForTimeout(2500);
  r.anaAposReload = { erro: await A.p.locator('p.text-destructive').count(), participantes: await A.p.locator('aside li').allInnerTexts() };

  await A.ctx.close();
  await B.p.waitForTimeout(500);
  await B.p.getByRole('button', { name: 'Tentar de novo' }).click();
  await B.p.waitForSelector('[data-chat-input]', { timeout: 15000 });
  await B.p.waitForTimeout(1000);
  r.segundoDepoisQueAnaSaiu = await B.p.locator('aside li').allInnerTexts();
  await B.ctx.close();
  return r;
}
