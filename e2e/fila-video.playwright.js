// Fila do player do YouTube (ADR 037). Precisa de um servidor LOCAL (`npm run dev`,
// porta 3000) e de internet: usa vídeos reais do YouTube e o oEmbed deles.
// Roda no Playwright MCP (`browser_run_code_unsafe` com `filename`) ou adaptado.
// O que deve dar (r.*):
//   anaFilaInicial   "A seguir · 3"  (B, um id que não existe, C)
//   betoSemBotoes    0 botões de ação pra quem não controla, e o aviso "Só Ana controla"
//   ordemDepoisDePriorizar  C vem antes do id inexistente
//   pulou            o "Tocando agora" de Ana E o de Beto mudam juntos
//   fimDoVideo       acabar o vídeo (pulo pro fim via postMessage) passa pro próximo sozinho
//   erroPulado       o id inexistente é pulado sozinho e o aviso aparece
//   removido         "Tirar da fila" tira só aquele item
async (page) => {
  const A = 'jNQXAC9IVRw'; // "Me at the zoo", 19s
  const B = 'dQw4w9WgXcQ';
  const RUIM = 'aaaaaaaaaaa'; // não existe: o player dá erro 100
  const C = '9bZkp7q19f0';
  const D = 'kJQP7kiw5Fk';
  const link = (id) => `https://youtu.be/${id}`;

  const browser = page.context().browser();
  const url = 'http://localhost:3000/sala/fila-' + Date.now().toString(36);
  const entrar = async (nome) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(url);
    await p.locator('#nome-convite').fill(nome);
    await p.locator('#nome-convite').press('Enter');
    await p.waitForSelector('[data-chat-input]');
    return { ctx, p };
  };
  const painel = (p) => p.locator('aside:has(section[aria-label="Tocando agora"])');
  const tocando = async (p) =>
    (await painel(p).locator('section[aria-label="Tocando agora"] li p').first().innerText()).trim();
  const aSeguir = (p) => painel(p).locator('section[aria-label="A seguir"] ol li');
  const titulos = async (p) =>
    (await aSeguir(p).locator('p.line-clamp-2').allInnerTexts()).map((t) => t.trim());
  // Espera o título sair de "Carregando…" (vem do oEmbed).
  const esperarTitulos = (p) =>
    p.waitForFunction(() => !document.body.innerText.includes('Carregando…'), null, { timeout: 15000 });
  const adicionarNaFila = async (p, id) => {
    await p.locator('#link-video').fill(link(id));
    await p.getByRole('button', { name: 'Adicionar à fila', exact: true }).last().click();
    await p.getByRole('status').filter({ hasText: /Entrou na fila|Adicionado|cheia|Só quem/ }).first().waitFor({ timeout: 5000 }).catch(() => {});
  };
  const r = {};

  const ana = await entrar('Ana');
  await ana.p.getByRole('button', { name: 'Adicionar vídeo' }).first().click();
  await ana.p.locator('#link-video').fill(link(A));
  await ana.p.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await ana.p.waitForSelector('iframe[src*="youtube.com/embed"]', { timeout: 15000 });
  r.dialogoFechouAoAbrirPlayer = (await ana.p.locator('#link-video').count()) === 0;

  const beto = await entrar('Beto');
  await beto.p.waitForSelector('iframe[src*="youtube.com/embed"]', { timeout: 15000 });

  // Monta a fila pelo diálogo, que fica aberto entre um link e outro.
  await ana.p.getByRole('button', { name: 'Adicionar à fila' }).first().click();
  for (const id of [B, RUIM, C]) await adicionarNaFila(ana.p, id);
  r.mensagemNoDialogo = await ana.p.getByRole('status').filter({ hasText: /Entrou na fila/ }).first().innerText().catch(() => null);
  await ana.p.keyboard.press('Escape');
  await esperarTitulos(ana.p);
  r.anaFilaInicial = (await painel(ana.p).locator('section[aria-label="A seguir"] h3').innerText()).trim();

  // Quem só assiste vê a fila, mas sem botões.
  await esperarTitulos(beto.p);
  r.betoVeAFila = (await titulos(beto.p)).length;
  r.betoSemBotoes = {
    botoes: await painel(beto.p).locator('button').count(),
    aviso: await painel(beto.p).getByText('Só Ana controla').count(),
  };

  // Priorizar: o C passa na frente do id inexistente.
  const antes = await titulos(ana.p);
  await aSeguir(ana.p).nth(2).hover();
  await aSeguir(ana.p).nth(2).getByRole('button', { name: 'Tocar em seguida' }).click();
  await ana.p.waitForTimeout(500);
  r.ordemAntes = antes;
  r.ordemDepoisDePriorizar = await titulos(ana.p);
  r.ordemNoBeto = await titulos(beto.p);

  // Pular: os dois "Tocando agora" mudam juntos.
  const tocandoAntes = await tocando(ana.p);
  await painel(ana.p).locator('section[aria-label="Tocando agora"] li').hover();
  await painel(ana.p).getByRole('button', { name: 'Pular pro próximo' }).click();
  await ana.p.waitForTimeout(800);
  r.pulou = {
    antes: tocandoAntes,
    ana: await tocando(ana.p),
    beto: await tocando(beto.p),
    restantesAna: (await titulos(ana.p)).length,
    restantesBeto: (await titulos(beto.p)).length,
  };

  // Fim do vídeo: pula o vídeo atual pro último segundo (sem som, pra o navegador deixar tocar sozinho).
  const comandar = (p, func, args = []) =>
    p.evaluate(
      ([f, a]) => {
        const ifr = document.querySelector('iframe[src*="youtube.com/embed"]');
        ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: f, args: a }), '*');
      },
      [func, args]
    );
  // Põe o vídeo curto (A) de volta como atual pra ter duração conhecida.
  await ana.p.getByRole('button', { name: 'Adicionar à fila' }).first().click();
  await adicionarNaFila(ana.p, A);
  await ana.p.keyboard.press('Escape');
  await esperarTitulos(ana.p);
  const idxA = (await titulos(ana.p)).length - 1;
  await aSeguir(ana.p).nth(idxA).hover();
  await aSeguir(ana.p).nth(idxA).getByRole('button', { name: 'Tocar agora' }).click();
  await ana.p.waitForTimeout(3000);
  const tocandoA = await tocando(ana.p);
  await comandar(ana.p, 'mute');
  await comandar(ana.p, 'playVideo');
  await ana.p.waitForTimeout(1500);
  await comandar(ana.p, 'seekTo', [16, true]);
  await ana.p.waitForFunction((t) => {
    const el = document.querySelector('section[aria-label="Tocando agora"] li p');
    return el && el.innerText.trim() !== t;
  }, tocandoA, { timeout: 20000 }).catch(() => {});
  r.fimDoVideo = { antes: tocandoA, depoisAna: await tocando(ana.p), depoisBeto: await tocando(beto.p) };

  // Erro: com algo na fila depois dele, o vídeo que não toca é pulado sozinho
  // (e o aviso aparece pra todo mundo). Aqui a fila é [id inexistente] e eu
  // ponho o D depois dele antes de chegar lá.
  await ana.p.getByRole('button', { name: 'Adicionar à fila' }).first().click();
  await adicionarNaFila(ana.p, D);
  await ana.p.keyboard.press('Escape');
  await esperarTitulos(ana.p);
  const filaAntesDoErro = await titulos(ana.p);
  await painel(ana.p).locator('section[aria-label="Tocando agora"] li').hover();
  await painel(ana.p).getByRole('button', { name: 'Pular pro próximo' }).click();
  const avisoVisto = await beto.p
    .getByText('Esse vídeo não pode ser reproduzido aqui')
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  await ana.p.waitForTimeout(1500);
  r.erroPulado = {
    filaAntes: filaAntesDoErro,
    avisoVisto,
    tocandoDepoisAna: await tocando(ana.p),
    tocandoDepoisBeto: await tocando(beto.p),
    restantes: await titulos(ana.p),
  };

  // Remover só o item citado.
  await ana.p.getByRole('button', { name: 'Adicionar à fila' }).first().click();
  await adicionarNaFila(ana.p, C);
  await adicionarNaFila(ana.p, B);
  await ana.p.keyboard.press('Escape');
  await esperarTitulos(ana.p);
  const antesRemover = await titulos(ana.p);
  const ult = antesRemover.length - 1;
  await aSeguir(ana.p).nth(ult).hover();
  await aSeguir(ana.p).nth(ult).getByRole('button', { name: 'Tirar da fila' }).click();
  await ana.p.waitForTimeout(500);
  r.removido = { antes: antesRemover.length, depois: (await titulos(ana.p)).length, beto: (await titulos(beto.p)).length };

  await ana.ctx.close();
  await beto.ctx.close();
  return r;
}
