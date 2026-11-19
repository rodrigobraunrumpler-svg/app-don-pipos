import { stockLine } from "./coverage";

test("en la nevera −2", () =>
  expect(stockLine({ state: "check", onHand: -2, physical: -2, minStock: 6 })).toBe(
    "2 vendidos de más: cuenta y ajusta",
  ));
test("en la nevera −1, en singular", () =>
  expect(stockLine({ state: "check", onHand: -1, physical: -1, minStock: 6 })).toBe(
    "1 vendido de más: cuenta y ajusta",
  ));
test("libre −14 y en la nevera 10", () =>
  expect(stockLine({ state: "owed", onHand: -14, physical: 10, minStock: 6 })).toBe("Faltan 14 para pedidos: produce"));
test("libre −1, en singular", () =>
  expect(stockLine({ state: "owed", onHand: -1, physical: 3, minStock: 6 })).toBe("Falta 1 para pedidos: produce"));
test("stock 0", () => expect(stockLine({ state: "out", onHand: 0, physical: 0, minStock: 6 })).toBe("Sin stock"));
test("poco o alcanza: el mínimo", () => {
  expect(stockLine({ state: "low", onHand: 4, physical: 4, minStock: 6 })).toBe("Mínimo 6");
  expect(stockLine({ state: "ok", onHand: 21, physical: 21, minStock: 6 })).toBe("Mínimo 6");
});
