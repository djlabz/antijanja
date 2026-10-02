# Cenários no navegador (Playwright)

Roteiros que cobrem o que os testes do servidor (`npm test`) não alcançam:
reconexão de verdade e estados da tela. **Não rodam no CI** (precisam de um
navegador e do app no ar) — são pra rodar à mão depois de mexer na sala,
no chat ou na conexão.

Cada arquivo `.playwright.js` é o corpo de uma função `async (page) => { ... }`
pra colar no `browser_run_code_unsafe` do Playwright MCP (ou numa função de um
script Playwright seu), com o app em `http://localhost:3000` (`npm run dev`).
Cada um devolve um objeto com o que mediu e diz, no topo, o que deve dar.
