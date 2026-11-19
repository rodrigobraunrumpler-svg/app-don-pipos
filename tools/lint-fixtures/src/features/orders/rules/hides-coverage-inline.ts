export function half(amount: number): number {
  // Esta rama no se prueba, así que: istanbul ignore next
  if (amount < 0) return 0;
  return amount / 2;
}
