import { formatCents } from "@/lib/money";

import type { Ranking } from "../schema/report";

type Product = Ranking["products"][number];
export type RankBy = "units" | "soles";

// Los más vendidos primero, en unidades o en soles; si empatan, por nombre
export function rankBy(products: Product[], by: RankBy): Product[] {
  const value = (product: Product) => (by === "units" ? product.units : product.salesCents);
  return [...products].sort((a, b) => value(b) - value(a) || a.name.localeCompare(b.name));
}

export const unitsText = (units: number): string => `${units} ${units === 1 ? "unidad" : "unidades"}`;

export const ordersText = (orders: number): string => `${orders} ${orders === 1 ? "pedido" : "pedidos"}`;

// «Gana S/ 7.00 por alfajor (cuesta S/ 5.00)», con el costo de cada venta; sin costo, invita a ponerlo
export function profitText({ units, costCents, profitCents }: Product): string {
  if (profitCents === null) return "Sin costo: ponlo en Productos";
  const cost = costCents === null ? "" : ` (cuesta ${formatCents(costCents)})`;
  return `Gana ${formatCents(Math.round(profitCents / units))} por alfajor${cost}`;
}
