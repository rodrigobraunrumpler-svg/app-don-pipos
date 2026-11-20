type Input = { lines: { quantity: number; unitPriceCents: number }[]; deliveryFeeCents: number; discountCents: number };

// El total del borrador mientras se arma (vista previa: lo guardado lo calcula la base). Nunca es negativo
export function draftTotal({ lines, deliveryFeeCents, discountCents }: Input): {
  subtotalCents: number;
  totalCents: number;
} {
  const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  return { subtotalCents, totalCents: Math.max(0, subtotalCents + deliveryFeeCents - discountCents) };
}

// Al editar un pedido (vista previa): el total nuevo y, si baja de lo pagado, la devolución de la diferencia. Sin
// alfajores no hay nada que guardar, así que no se pide devolución
export function editedTotals(input: Input & { paidCents: number }): { totalCents: number; refundCents: number } {
  const { totalCents } = draftTotal(input);
  return { totalCents, refundCents: input.lines.length ? Math.max(input.paidCents - totalCents, 0) : 0 };
}
