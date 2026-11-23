/** Formata só valores de moedas no padrão pt-BR: 1000 → "1.000". */
export function formatCoins(value: number) {
  const n = Math.trunc(Number.isFinite(value) ? value : 0)
  return n.toLocaleString('pt-BR')
}
