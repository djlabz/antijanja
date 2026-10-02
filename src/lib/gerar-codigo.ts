const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"; // sem letras/números ambíguos (0/o, 1/l/i)

/**
 * Gera o código de uma sala nova. 8 caracteres de um alfabeto de 31 dão ~8,5
 * trilhões de combinações — com o link público do Cloudflare qualquer um pode
 * TESTAR códigos, e com 5 (28 milhões) e `Math.random` isso não era tão
 * longe do possível. Usa `crypto` (imprevisível) quando existe (ADR 027).
 */
export function gerarCodigoDeSala(tamanho = 8): string {
  const sorteios = new Uint32Array(tamanho);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(sorteios);
  } else {
    for (let i = 0; i < tamanho; i++) sorteios[i] = Math.floor(Math.random() * 2 ** 32);
  }
  let codigo = "";
  for (let i = 0; i < tamanho; i++) codigo += ALFABETO[sorteios[i] % ALFABETO.length];
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
