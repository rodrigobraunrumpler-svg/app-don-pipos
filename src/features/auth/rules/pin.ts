// Un PIN es fácil de adivinar si sigue un patrón o repite el final del celular del dueño (docs/spec/auth.md §5).
// La base tiene la misma regla (private.pin_is_obvious): el servidor decide; aquí solo se avisa antes de enviar.
export function pinIsObvious(pin: string, phone: string): boolean {
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((digit, index) => digit - digits[index]!);
  // Seguidos hacia arriba o hacia abajo, sin dar la vuelta del 9 al 0
  const inARow = steps.every((step) => step === 1) || steps.every((step) => step === -1);
  const repeatedPair = pin === pin.slice(0, 2).repeat(3);
  const repeatedTriple = pin === pin.slice(0, 3).repeat(2);
  return inARow || repeatedPair || repeatedTriple || pin === phone.replace(/\D/g, "").slice(-6);
}
