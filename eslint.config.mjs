import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Roteiros do Playwright (corpo de função solto, colado no MCP): não são módulos.
    "e2e/**",
    // Scripts de ferramentas de IA (skills, agentes) vendorizadas por agente
    // — não é código do app, não é nosso pra lintar.
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".gemini/**",
    ".opencode/**",
  ]),
]);

export default eslintConfig;
