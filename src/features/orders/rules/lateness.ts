import { businessDate, formatShortDate, formatWeekday } from "@/lib/dates";

import type { Fulfillment, OrderStatus } from "../schema/order";

type Order = { status: OrderStatus; fulfillment: Fulfillment; dueDate: string; promisedAt: string | null };
export type Lateness = { kind: "overdue"; since: string } | { kind: "late"; minutes: number } | null;

const DAY_MS = 86_400_000;

// «Hecho» es listo o entregado si recoge, y entregado si es delivery
const isDone = ({ status, fulfillment }: Order): boolean =>
  status === "delivered" || status === "cancelled" || (fulfillment === "pickup" && status === "ready");

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

// ¿Va tarde? Atrasado: su día ya pasó. Tarde: es de hoy, tiene hora acordada y ya pasó. Con los días de Lima
export function lateness(order: Order, now: Date): Lateness {
  if (isDone(order)) return null;
  const today = businessDate(now);
  if (order.dueDate < today) return { kind: "overdue", since: order.dueDate };
  if (order.dueDate !== today || !order.promisedAt) return null;
  const minutes = Math.floor((now.getTime() - Date.parse(order.promisedAt)) / 60_000);
  return minutes > 0 ? { kind: "late", minutes } : null;
}

export function latenessLabel(value: Lateness, now: Date): string {
  if (!value) return "";
  if (value.kind === "late") return `${value.minutes} min tarde`;
  const days = daysBetween(value.since, businessDate(now));
  if (days === 1) return "Atrasado desde ayer";
  // El mediodía de Lima de ese día, para nombrarlo
  const noon = new Date(`${value.since}T12:00:00-05:00`);
  if (days < 7) return `Atrasado desde el ${formatWeekday(noon).toLowerCase()}`;
  return `Atrasado desde el ${formatShortDate(noon)}`;
}

// En la fila de la lista, corto: el día del pedido ya va junto a su número («#0037, ayer»)
export function latenessShortLabel(value: Lateness): string {
  if (!value) return "";
  return value.kind === "late" ? `${value.minutes} min tarde` : "Atrasado";
}
