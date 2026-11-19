import { businessDate, formatShortDate, formatTime, formatWeekday } from "@/lib/dates";

import { ADJUSTMENT_LABELS, WASTE_REASONS } from "../constants";
import type { MovementKind } from "../schema/stock";

const DAY_MS = 86_400_000;

// El texto de un movimiento en el historial de un alfajor
export function movementLabel(kind: MovementKind, reason: string | null): string {
  if (kind === "production") return "Producción";
  if (kind === "sale") return "Venta";
  if (kind === "cancellation") return "Pedido anulado";
  if (kind === "waste") {
    const label = WASTE_REASONS.find(([code]) => code === reason)?.[1];
    return label ? `Merma: ${label.toLowerCase()}` : "Merma";
  }
  return Object.entries(ADJUSTMENT_LABELS).find(([code]) => code === reason)?.[1] ?? "Ajuste";
}

// Cuándo pasó, con los días de Lima: «Hoy 08:10», «Ayer 17:30», «Lunes 18:00» (hasta 6 días atrás), «11 nov 17:30»
export function movementTime(happenedAt: Date, now: Date): string {
  const time = formatTime(happenedAt);
  const daysAgo = Math.round((Date.parse(businessDate(now)) - Date.parse(businessDate(happenedAt))) / DAY_MS);
  if (daysAgo <= 0) return `Hoy ${time}`;
  if (daysAgo === 1) return `Ayer ${time}`;
  if (daysAgo < 7) return `${formatWeekday(happenedAt)} ${time}`;
  return `${formatShortDate(happenedAt)} ${time}`;
}
