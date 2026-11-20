import { businessDate, formatTime } from "@/lib/dates";

const DAY_MS = 86_400_000;

// El último pedido del cliente: «Hoy, 09:30», «Ayer» o «Hace 34 días», con los días de Lima
export function lastOrderLabel(at: Date, now: Date): string {
  const days = Math.round((Date.parse(businessDate(now)) - Date.parse(businessDate(at))) / DAY_MS);
  if (days <= 0) return `Hoy, ${formatTime(at)}`;
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

// La línea de un cliente en Clientes: «7 pedidos, último hoy, 09:30»
export function customerLine(
  { ordersCount, lastOrderAt }: { ordersCount: number; lastOrderAt: string | null },
  now: Date,
): string {
  const orders = `${ordersCount} ${ordersCount === 1 ? "pedido" : "pedidos"}`;
  if (!lastOrderAt) return orders;
  const label = lastOrderLabel(new Date(lastOrderAt), now);
  return `${orders}, último ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}
