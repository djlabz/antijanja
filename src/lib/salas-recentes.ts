/**
 * Últimas salas em que esta pessoa entrou, guardadas só neste aparelho
 * (`localStorage`): sem conta e sem servidor (ADR 001). Sem imports de DOM/React
 * pra testar no Node — o hook que lê/escreve o `localStorage` fica em
 * `use-salas-recentes.ts`.
 *
 * Tudo trabalha com o texto bruto guardado (`string | null`): lê, devolve o novo
 * texto, e quem chama grava. Dado torto no armazenamento nunca quebra nada.
 */

export interface SalaRecente {
  codigo: string;
  /** Quando entrou pela última vez (ms desde 1970). */
  em: number;
}

export const MAX_SALAS_RECENTES = 5;
export const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;
/** Mesmo limite do campo da home e do servidor (`MAX_CODIGO`). */
const MAX_CODIGO = 40;

function ehSalaRecente(valor: unknown): valor is SalaRecente {
  if (typeof valor !== "object" || valor === null) return false;
  const { codigo, em } = valor as Record<string, unknown>;
  return (
    typeof codigo === "string" &&
    codigo.length > 0 &&
    codigo.length <= MAX_CODIGO &&
    typeof em === "number" &&
    Number.isFinite(em)
  );
}

/** As salas guardadas, da mais recente pra mais antiga, sem as vencidas. */
export function lerSalasRecentes(bruto: string | null, agora: number): SalaRecente[] {
  if (!bruto) return [];
  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return [];
  }
  if (!Array.isArray(dados)) return [];
  return dados
    .filter(ehSalaRecente)
    .filter((s) => agora - s.em <= VALIDADE_MS)
    .map(({ codigo, em }) => ({ codigo, em }))
    .sort((a, b) => b.em - a.em)
    .slice(0, MAX_SALAS_RECENTES);
}

/** Texto novo pra gravar: a sala vai pro topo (sem repetir) e a lista é cortada. */
export function lembrarSala(bruto: string | null, codigo: string, agora: number): string {
  const outras = lerSalasRecentes(bruto, agora).filter((s) => s.codigo !== codigo);
  return JSON.stringify([{ codigo, em: agora }, ...outras].slice(0, MAX_SALAS_RECENTES));
}

export function esquecerSala(bruto: string | null, codigo: string, agora: number): string {
  return JSON.stringify(lerSalasRecentes(bruto, agora).filter((s) => s.codigo !== codigo));
}

/** "agora há pouco", "há 5 min", "há 2 h", "ontem", "há 3 dias". */
export function descreverQuando(em: number, agora: number): string {
  const minutos = Math.floor((agora - em) / 60_000);
  if (minutos < 1) return "agora há pouco";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}
