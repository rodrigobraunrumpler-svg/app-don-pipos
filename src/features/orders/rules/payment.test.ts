import { paymentLabel } from "./payment";

const NBSP = " ";

test("el texto del cobro de la fila", () => {
  expect(paymentLabel({ status: "cancelled", totalCents: 4200, paidCents: 0 })).toBe("Anulado");
  expect(paymentLabel({ status: "delivered", totalCents: 4200, paidCents: 4200 })).toBe("Pagado");
  expect(paymentLabel({ status: "new", totalCents: 4200, paidCents: 2000 })).toBe(`Falta S/${NBSP}22.00`);
  expect(paymentLabel({ status: "new", totalCents: 1200, paidCents: 0 })).toBe(`Cobrar S/${NBSP}12.00`);
});
