import { formatCents } from "@/lib/money";

import type { Fulfillment, OrderStatus } from "../schema/order";
import { dueDayLabel } from "./day";

type Item = { status: OrderStatus; fulfillment: Fulfillment; paidCents: number; scheduledFor: string | null };

// Por qué le deben, en la fila de Por cobrar (la maqueta): entregado y debiendo, un adelanto (con su día de entrega si
// es para otro día) o se cobra al recoger o al entregar
export function receivableReason(item: Item, now: Date): string {
  if (item.status === "delivered") return "Entregado, quedó debiendo";
  if (item.paidCents > 0) {
    const day = item.scheduledFor ? dueDayLabel(item.scheduledFor, now) : "";
    const when = !day ? "" : day === "mañana" ? ", entrega mañana" : `, entrega el ${day}`;
    return `Adelanto de ${formatCents(item.paidCents)}${when}`;
  }
  return item.fulfillment === "pickup" ? "Se cobra al recoger" : "Se cobra al entregar";
}
