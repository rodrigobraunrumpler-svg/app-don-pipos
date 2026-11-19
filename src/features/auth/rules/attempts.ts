export function attemptsLabel(left: number): string {
  return left === 1 ? "Te queda 1 intento" : `Te quedan ${left} intentos`;
}
