import type { StockState } from "../schema/stock";

type Item = { state: StockState; onHand: number; physical: number; minStock: number };

// La línea de cada alfajor en Stock. En la fase 4, con la venta esperada, dice hasta cuándo alcanza
export function stockLine({ state, onHand, physical, minStock }: Item): string {
  if (state === "check") return `${-physical} ${physical === -1 ? "vendido" : "vendidos"} de más: cuenta y ajusta`;
  if (state === "owed") return `${onHand === -1 ? "Falta" : "Faltan"} ${-onHand} para pedidos: produce`;
  if (state === "out") return "Sin stock";
  return `Mínimo ${minStock}`;
}
