import { overStockWarning, stockHint } from "./stock-hint";

test("junto a cada alfajor, cuánto queda para vender", () => {
  expect(stockHint({ onHand: 13, state: "ok" })).toEqual({ text: "Quedan 13", low: false });
  expect(stockHint({ onHand: 4, state: "low" })).toEqual({ text: "Quedan 4", low: true });
  expect(stockHint({ onHand: 0, state: "out" })).toEqual({ text: "Agotado", low: true });
  expect(stockHint({ onHand: -3, state: "owed" })).toEqual({ text: "Agotado", low: true });
  expect(stockHint({ onHand: -2, state: "check" })).toEqual({ text: "Stock en −2", low: true });
});

test("pedir más de lo que hay avisa, sin bloquear (D12)", () => {
  expect(overStockWarning(13, 13)).toBeNull();
  expect(overStockWarning(14, 13)).toBe("Solo quedan 13. Puedes anotarlo igual y ajustar el stock después.");
  expect(overStockWarning(1, 0)).toBe("No hay en stock. Puedes anotarlo igual y ajustar el stock después.");
  expect(overStockWarning(1, -2)).toBe("No hay en stock. Puedes anotarlo igual y ajustar el stock después.");
});
