import { formatWeekday } from "@/lib/dates";

import type { StockState } from "../schema/stock";

type Item = { state: StockState; onHand: number; physical: number; minStock: number; coverageDays: number | null };

const DAY_MS = 86_400_000;

// La línea de cada alfajor en Stock: lo que no cuadra, lo que falta para pedidos, sin stock o hasta cuándo alcanza
// desde mañana (como la maqueta). Sin 7 días de ventas, el mínimo
export function stockLine({ state, onHand, physical, minStock, coverageDays }: Item, now: Date): string {
  if (state === "check") return `${-physical} ${physical === -1 ? "vendido" : "vendidos"} de más: cuenta y ajusta`;
  if (state === "owed") return `${onHand === -1 ? "Falta" : "Faltan"} ${-onHand} para pedidos: produce`;
  if (state === "out") return "Sin stock";
  if (coverageDays === null) return `Mínimo ${minStock}`;
  if (coverageDays === 0) return "No alcanza para mañana";
  if (coverageDays === 1) return "Alcanza hasta mañana";
  if (coverageDays >= 7) return "Alcanza para más de una semana";
  return `Alcanza hasta el ${formatWeekday(new Date(now.getTime() + coverageDays * DAY_MS)).toLowerCase()}`;
}

// En Un alfajor, «le alcanza» en corto; null sin historia (no se muestra)
export function coverageShort({
  state,
  onHand,
  coverageDays,
}: Pick<Item, "state" | "onHand" | "coverageDays">): string | null {
  if (state === "check") return "Revisar";
  if (state === "out" || onHand <= 0) return "0 días";
  if (coverageDays === null) return null;
  if (coverageDays >= 7) return "7+ días";
  return `${coverageDays} ${coverageDays === 1 ? "día" : "días"}`;
}
