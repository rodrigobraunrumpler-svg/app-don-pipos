type Input = { lines: { quantity: number; unitPriceCents: number }[]; deliveryFeeCents: number; discountCents: number };

// El total del borrador mientras se arma (vista previa: lo guardado lo calcula la base). Nunca es negativo
export function draftTotal({ lines, deliveryFeeCents, discountCents }: Input): {
  subtotalCents: number;
  totalCents: number;
} {
  const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  return { subtotalCents, totalCents: Math.max(0, subtotalCents + deliveryFeeCents - discountCents) };
}
