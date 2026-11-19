import { businessDate, formatTime } from "@/lib/dates";

const DAY_MS = 86_400_000;

// El último pedido del cliente: «Hoy, 09:30», «Ayer» o «Hace 34 días», con los días de Lima
export function lastOrderLabel(at: Date, now: Date): string {
  const days = Math.round((Date.parse(businessDate(now)) - Date.parse(businessDate(at))) / DAY_MS);
  if (days <= 0) return `Hoy, ${formatTime(at)}`;
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}
