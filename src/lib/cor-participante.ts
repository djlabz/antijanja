/**
 * Deriva uma cor estável (mesmo hash sempre dá a mesma cor) pro avatar de
 * cada participante, a partir do id do socket — sem guardar nada, sem
 * depender de ordem de entrada na sala.
 */
export function corDoParticipante(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const matiz = Math.abs(hash) % 360;
  return `oklch(0.6 0.14 ${matiz})`;
}
