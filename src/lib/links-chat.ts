/**
 * Acha links http/https no texto de uma mensagem do chat. Só esses dois
 * protocolos viram link (nada de `javascript:` ou `data:`), e o resultado
 * é sempre uma lista de pedaços — quem desenha usa `<a>`/texto do React, nunca
 * HTML cru. Sem imports de DOM/React: testável no Node.
 */

export type ParteDoTexto = { tipo: "texto" | "link"; valor: string };

const CANDIDATO = /https?:\/\/[^\s<>"']+/gi;
const PONTUACAO_FINAL = /[.,;:!?'"\]}]$/;

/** Tira do fim o que é pontuação da frase, não do endereço (ex.: "x.com." ou "(x.com)"). */
function aparar(link: string): string {
  let atual = link;
  for (;;) {
    if (PONTUACAO_FINAL.test(atual)) {
      atual = atual.slice(0, -1);
    } else if (atual.endsWith(")") && !atual.includes("(")) {
      atual = atual.slice(0, -1);
    } else {
      return atual;
    }
  }
}

function ehUrlValida(valor: string): boolean {
  try {
    const { protocol } = new URL(valor);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function partirEmLinks(texto: string): ParteDoTexto[] {
  const partes: ParteDoTexto[] = [];
  let cursor = 0;
  const empurrar = (tipo: ParteDoTexto["tipo"], valor: string) => {
    if (!valor) return;
    const ultima = partes[partes.length - 1];
    if (tipo === "texto" && ultima?.tipo === "texto") ultima.valor += valor;
    else partes.push({ tipo, valor });
  };

  for (const achado of texto.matchAll(CANDIDATO)) {
    const inicio = achado.index ?? 0;
    const link = aparar(achado[0]);
    if (!ehUrlValida(link)) continue;
    empurrar("texto", texto.slice(cursor, inicio));
    empurrar("link", link);
    cursor = inicio + link.length;
  }
  empurrar("texto", texto.slice(cursor));
  return partes;
}
