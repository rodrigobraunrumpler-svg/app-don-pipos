import type { Fulfillment } from "../schema/order";
import { dueDayLabel } from "./day";

type Order = { customerName: string | null; fulfillment: Fulfillment; dueDate: string };

// Debajo del número del pedido: «Ana Q., delivery hoy», «Luis, recoge en el local el sábado 21», «Venta en el
// mostrador, ayer». El día es el del pedido (due_date), con los días de Lima
export function orderHeadline(order: Order, now: Date): string {
  const day = dueDayLabel(order.dueDate, now);
  const when = !day ? "hoy" : day === "ayer" || day === "mañana" ? day : `el ${day}`;
  if (order.fulfillment === "counter") return `Venta en el mostrador, ${when}`;
  const how = order.fulfillment === "delivery" ? "delivery" : "recoge en el local";
  return `${order.customerName ?? "Cliente"}, ${how} ${when}`;
}
