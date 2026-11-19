import type { StockItem, StockState } from "../schema/stock";

// El estado de un alfajor, con las mismas reglas que stock_overview. Aquí solo sirve para mostrar un cambio al instante,
// hasta que responda la base (lo guardado lo calcula ella)
export function stockState({
  onHand,
  reserved,
  minStock,
}: {
  onHand: number;
  reserved: number;
  minStock: number;
}): StockState {
  if (onHand + reserved < 0) return "check";
  if (onHand < 0) return "owed";
  if (onHand === 0) return "out";
  if (onHand <= minStock) return "low";
  return "ok";
}

// Suma cada cambio a lo libre de su alfajor y recalcula lo que hay en la nevera y el estado
export function applyStockChanges(items: StockItem[], changes: { productId: string; delta: number }[]): StockItem[] {
  return items.map((item) => {
    const delta = changes.find((change) => change.productId === item.productId)?.delta ?? 0;
    if (delta === 0) return item;
    const onHand = item.onHand + delta;
    return { ...item, onHand, physical: onHand + item.reserved, state: stockState({ ...item, onHand }) };
  });
}
