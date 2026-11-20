import { draftTotal, editedTotals } from "./totals";

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

test("al editar: el total nuevo y, si baja de lo pagado, cuánto se devuelve", () => {
  const pipo = [{ quantity: 1, unitPriceCents: 1300 }];
  expect(editedTotals({ lines: LINES, deliveryFeeCents: 500, discountCents: 0, paidCents: 2000 })).toEqual({
    totalCents: 4200,
    refundCents: 0,
  });
  expect(editedTotals({ lines: pipo, deliveryFeeCents: 500, discountCents: 0, paidCents: 2000 })).toEqual({
    totalCents: 1800,
    refundCents: 200,
  });
  // Sin alfajores no hay pedido que guardar: no se pide devolución
  expect(editedTotals({ lines: [], deliveryFeeCents: 500, discountCents: 0, paidCents: 2000 })).toEqual({
    totalCents: 500,
    refundCents: 0,
  });
});
