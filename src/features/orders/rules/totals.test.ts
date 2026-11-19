import { draftTotal } from "./totals";

const LINES = [
  { quantity: 2, unitPriceCents: 1200 },
  { quantity: 1, unitPriceCents: 1300 },
];

test("2 Coquetas + 1 Pipo Crush + delivery S/ 5.00 → S/ 42.00", () =>
  expect(draftTotal({ lines: LINES, deliveryFeeCents: 500, discountCents: 0 })).toEqual({
    subtotalCents: 3700,
    totalCents: 4200,
  }));
test("con un descuento de S/ 10.00 → S/ 32.00", () =>
  expect(draftTotal({ lines: LINES, deliveryFeeCents: 500, discountCents: 1000 }).totalCents).toBe(3200));
test("el total nunca es negativo", () =>
  expect(
    draftTotal({ lines: [{ quantity: 1, unitPriceCents: 1200 }], deliveryFeeCents: 0, discountCents: 5000 }).totalCents,
  ).toBe(0));
