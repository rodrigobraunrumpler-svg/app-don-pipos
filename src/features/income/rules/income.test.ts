import { incomeSaveLabel, incomeTitle } from "./income";

const base = { orderNumber: 42, customerName: "Ana (DEMO)", description: null };

test("el botón dice cuánto se guarda", () => {
  expect(incomeSaveLabel(1500)).toBe("Guardar ingreso de S/ 15.00");
  expect(incomeSaveLabel(0)).toBe("Guardar ingreso");
});

test("cada fila dice de dónde vino", () => {
  expect(incomeTitle({ ...base, kind: "payment" })).toBe("Pedido #0042, Ana (DEMO)");
  expect(incomeTitle({ ...base, kind: "payment", customerName: null })).toBe("Pedido #0042, mostrador");
  expect(incomeTitle({ ...base, kind: "refund" })).toBe("Devolución, pedido #0042");
  expect(
    incomeTitle({ kind: "manual", orderNumber: null, customerName: null, description: "Venta a un café (DEMO)" }),
  ).toBe("Venta a un café (DEMO)");
});
