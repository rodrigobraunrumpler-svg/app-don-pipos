import type { Fulfillment, OrderStatus } from "../schema/order";

const FLOW: Record<Fulfillment, OrderStatus[]> = {
  delivery: ["new", "preparing", "on_the_way", "delivered"],
  pickup: ["new", "preparing", "ready", "delivered"],
  counter: ["delivered"],
};

const NEXT_LABELS: Partial<Record<OrderStatus, string>> = {
  preparing: "Empezar a preparar",
  on_the_way: "Marcar en camino",
  ready: "Marcar listo para recoger",
  delivered: "Marcar entregado",
};

// Los estados por los que pasa un pedido según su entrega (la línea de tiempo)
export function statusFlow(fulfillment: Fulfillment): OrderStatus[] {
  return FLOW[fulfillment];
}

// El siguiente estado según la entrega; el mostrador nace entregado
export function nextStatus(fulfillment: Fulfillment, status: OrderStatus): OrderStatus | null {
  const flow = FLOW[fulfillment];
  const index = flow.indexOf(status);
  return index >= 0 && index < flow.length - 1 ? flow[index + 1]! : null;
}

// El botón que lleva a ese estado
export function nextStatusLabel(status: OrderStatus): string {
  return NEXT_LABELS[status] ?? "";
}
