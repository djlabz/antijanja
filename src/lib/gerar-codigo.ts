const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"; // sem letras/números ambíguos (0/o, 1/l/i)

/** Gera um código de sala curto e fácil de ditar em voz alta pro grupo. */
export function gerarCodigoDeSala(tamanho = 5): string {
  let codigo = "";
  for (let i = 0; i < tamanho; i++) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return codigo;
}
