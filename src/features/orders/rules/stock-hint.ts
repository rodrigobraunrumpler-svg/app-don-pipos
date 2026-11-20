type Stock = { onHand: number; state: "check" | "owed" | "out" | "low" | "ok" };

// Junto a cada alfajor del pedido, cuánto queda para vender (lo libre de stock_overview)
export function stockHint({ onHand, state }: Stock): { text: string; low: boolean } {
  if (onHand > 0) return { text: `Quedan ${onHand}`, low: state === "low" };
  if (state === "check") return { text: `Stock en ${String(onHand).replace("-", "−")}`, low: true };
  return { text: "Agotado", low: true };
}

// Pedir más de lo que hay avisa, pero no bloquea: el stock puede no estar al día (D12)
export function overStockWarning(quantity: number, onHand: number): string | null {
  if (quantity <= Math.max(onHand, 0)) return null;
  return `${onHand > 0 ? `Solo quedan ${onHand}.` : "No hay en stock."} Puedes anotarlo igual y ajustar el stock después.`;
}
