import type { ReminderTarget } from "../schema/reminder";

// La pantalla que abre cada aviso: el pedido, Registrar producción o Por cobrar
export function targetHref(target: ReminderTarget): string {
  if (target.screen === "order") return `/orders/${target.orderId}`;
  return target.screen === "production" ? "/stock/production" : "/orders/receivables";
}
