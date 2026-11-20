import type { StockItem } from "../schema/stock";
import { applyStockChanges, stockState } from "./state";

// Las mismas reglas que stock_overview: aquí solo para mostrar el cambio al instante, hasta que responda la base
test.each([
  [-2, 0, 6, "check"],
  [-14, 24, 6, "owed"],
  [0, 0, 6, "out"],
  [5, 0, 6, "low"],
  [6, 0, 6, "low"],
  [7, 0, 6, "ok"],
  [3, 0, 0, "ok"],
])("libre %i, apartado %i, mínimo %i → %s", (onHand, reserved, minStock, state) =>
  expect(stockState({ onHand, reserved, minStock })).toBe(state),
);

const item = (productId: string, onHand: number): StockItem => ({
  productId,
  name: productId,
  imageUrl: null,
  linkedToWeb: false,
  minStock: 6,
  onHand,
  reserved: 0,
  physical: onHand,
  coverageDays: null,
  state: stockState({ onHand, reserved: 0, minStock: 6 }),
});

test("aplica cada cambio al stock libre y recalcula lo demás; los otros quedan igual", () => {
  const [a, b] = applyStockChanges([item("a", 13), item("b", 4)], [{ productId: "a", delta: -13 }]);
  expect(a).toMatchObject({ onHand: 0, physical: 0, state: "out" });
  expect(b).toEqual(item("b", 4));
});
