// Estado "Conectando à sala…" (ADR 032) com o socket bloqueado.
// Deve dar: sozinho 0, antes "Conectando à sala…", depois com o aviso de demora.
async (page) => {
  await page.route('**/socket.io/**', r => r.abort());
  await page.goto('http://localhost:3000/sala/lenta-' + Date.now().toString(36));
  await page.getByRole('button', { name: 'Convidado' }).click();
  const antes = await page.locator('[role=status]').first().innerText();
  const sozinho = await page.getByText('Você está sozinho por aqui').count();
  await page.waitForTimeout(8500);
  const depois = await page.locator('[role=status]').first().innerText();
  return { antes, sozinho, depois };
}
