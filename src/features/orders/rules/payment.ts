import { formatCents } from "@/lib/money";

import type { OrderStatus } from "../schema/order";

// El texto del cobro en la fila, con lo que manda la base (lo que falta = total − pagado)
export function paymentLabel({
  status,
  totalCents,
  paidCents,
}: {
  status: OrderStatus;
  totalCents: number;
  paidCents: number;
}): string {
  if (status === "cancelled") return "Anulado";
  if (paidCents >= totalCents) return "Pagado";
  if (paidCents > 0) return `Falta ${formatCents(totalCents - paidCents)}`;
  return `Cobrar ${formatCents(totalCents)}`;
}
