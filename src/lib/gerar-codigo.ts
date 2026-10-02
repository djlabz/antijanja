const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"; // sem letras/números ambíguos (0/o, 1/l/i)

/** Gera um código de sala curto e fácil de ditar em voz alta pro grupo. */
export function gerarCodigoDeSala(tamanho = 5): string {
  let codigo = "";
  for (let i = 0; i < tamanho; i++) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return codigo;
}

/**
 * Deixa o que a pessoa digitou como código de sala seguro pra ir na URL:
 * minúsculo, sem acento, só letras/números e hífen. Sem isso `a/b` virava
 * `/sala/a/b` (404) e `oi?` virava uma query string.
 */
export function normalizarCodigo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}
