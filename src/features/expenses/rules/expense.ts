import { businessDate, formatMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export function expenseSaveLabel(cents: number): string {
  return cents > 0 ? `Guardar gasto de ${formatCents(cents)}` : "Guardar gasto";
}

// En la fila de un gasto corregido
export function correctedText(previousCents: number): string {
  return `Corregido, antes ${formatCents(previousCents)}`;
}

// «Gastado en noviembre»: del día 1 del mes de Lima hasta hoy
export function monthRange(now: Date): { from: string; to: string; label: string } {
  const to = businessDate(now);
  return { from: `${to.slice(0, 8)}01`, to, label: formatMonth(now) };
}

// El largo de una barra (0 a 100) frente a la más larga; una chiquita se ve igual
export function barShare(cents: number, maxCents: number): number {
  if (maxCents <= 0) return 0;
  return Math.max(Math.round((cents / maxCents) * 100), 2);
}
