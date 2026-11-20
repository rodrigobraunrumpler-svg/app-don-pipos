import { coverageShort, stockLine } from "./coverage";

// El miércoles 18 de noviembre de 2026, en Lima (como la especificación)
const NOW = new Date("2026-11-18T16:40:00.000Z");

test("en la nevera −2", () =>
  expect(stockLine({ state: "check", onHand: -2, physical: -2, minStock: 6, coverageDays: null }, NOW)).toBe(
    "2 vendidos de más: cuenta y ajusta",
  ));
test("en la nevera −1, en singular", () =>
  expect(stockLine({ state: "check", onHand: -1, physical: -1, minStock: 6, coverageDays: null }, NOW)).toBe(
    "1 vendido de más: cuenta y ajusta",
  ));
test("libre −14 y en la nevera 10", () =>
  expect(stockLine({ state: "owed", onHand: -14, physical: 10, minStock: 6, coverageDays: 0 }, NOW)).toBe(
    "Faltan 14 para pedidos: produce",
  ));
test("libre −1, en singular", () =>
  expect(stockLine({ state: "owed", onHand: -1, physical: 3, minStock: 6, coverageDays: null }, NOW)).toBe(
    "Falta 1 para pedidos: produce",
  ));
test("stock 0", () =>
  expect(stockLine({ state: "out", onHand: 0, physical: 0, minStock: 6, coverageDays: 0 }, NOW)).toBe("Sin stock"));
test("sin historia de ventas: el mínimo", () => {
  expect(stockLine({ state: "low", onHand: 4, physical: 4, minStock: 6, coverageDays: null }, NOW)).toBe("Mínimo 6");
  expect(stockLine({ state: "ok", onHand: 21, physical: 21, minStock: 6, coverageDays: null }, NOW)).toBe("Mínimo 6");
});

test("con ventas: hasta cuándo alcanza, desde mañana (hoy miércoles 18)", () => {
  const item = { state: "ok" as const, onHand: 21, physical: 21, minStock: 6 };
  expect(stockLine({ ...item, state: "low", coverageDays: 0 }, NOW)).toBe("No alcanza para mañana");
  expect(stockLine({ ...item, state: "low", coverageDays: 1 }, NOW)).toBe("Alcanza hasta mañana");
  expect(stockLine({ ...item, coverageDays: 2 }, NOW)).toBe("Alcanza hasta el viernes");
  expect(stockLine({ ...item, coverageDays: 6 }, NOW)).toBe("Alcanza hasta el martes");
  expect(stockLine({ ...item, coverageDays: 7 }, NOW)).toBe("Alcanza para más de una semana");
});

test("en Un alfajor, cuánto le alcanza en corto", () => {
  const item = { state: "ok" as const, onHand: 21, physical: 21, minStock: 6 };
  expect(coverageShort({ ...item, coverageDays: 2 })).toBe("2 días");
  expect(coverageShort({ ...item, coverageDays: 1 })).toBe("1 día");
  expect(coverageShort({ ...item, coverageDays: 7 })).toBe("7+ días");
  expect(coverageShort({ ...item, state: "out", onHand: 0, coverageDays: 0 })).toBe("0 días");
  expect(coverageShort({ ...item, state: "owed", onHand: -3, coverageDays: 0 })).toBe("0 días");
  expect(coverageShort({ ...item, state: "check", onHand: -2, coverageDays: 0 })).toBe("Revisar");
  expect(coverageShort({ ...item, coverageDays: null })).toBeNull();
});
