export function half(amount: number): number {
  /* v8 ignore next */
  if (amount < 0) return 0;
  return amount / 2;
}
