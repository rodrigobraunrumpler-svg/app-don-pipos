import { cashDifference, closedText, expectedCash } from "./difference";

test("debería haber: con cuánto abrió + lo cobrado − lo gastado", () => {
  expect(expectedCash(5000, 6300, 6900)).toBe(4400);
});

test("el resultado mientras se escribe lo contado (cash.md §5)", () => {
  expect(cashDifference(11000, 11000)).toEqual({
    tone: "ok",
    title: "La caja cuadra.",
    hint: "Todo el efectivo está.",
  });
  expect(cashDifference(10200, 12000)).toEqual({
    tone: "short",
    title: "Faltan S/ 18.00.",
    hint: "Revisa si falta anotar un gasto o un vuelto.",
  });
  expect(cashDifference(12500, 12000)).toEqual({
    tone: "over",
    title: "Sobran S/ 5.00.",
    hint: "Revisa si falta anotar una venta.",
  });
});

test("el día cerrado dice cómo quedó", () => {
  const count = { expectedCents: 12000, differenceCents: 0 };
  expect(closedText(count)).toBe("La caja cuadró: S/ 120.00 en efectivo.");
  expect(closedText({ ...count, differenceCents: -1800 })).toBe("Faltaron S/ 18.00. Quedó anotado.");
  expect(closedText({ ...count, differenceCents: 500 })).toBe("Sobraron S/ 5.00. Quedó anotado.");
});
