import { barShare, correctedText, expenseSaveLabel, monthRange } from "./expense";

test("el botón dice cuánto se guarda", () => {
  expect(expenseSaveLabel(8600)).toBe("Guardar gasto de S/ 86.00");
  expect(expenseSaveLabel(0)).toBe("Guardar gasto");
});

test("un gasto corregido dice cuánto era antes", () => {
  expect(correctedText(8600)).toBe("Corregido, antes S/ 86.00");
});

test("el mes de Lima: del día 1 a hoy, con su nombre", () => {
  // Las 23:30 del 30 de noviembre en Lima (las 04:30 del 1 de diciembre en UTC) siguen siendo noviembre
  expect(monthRange(new Date("2026-12-01T04:30:00.000Z"))).toEqual({
    from: "2026-11-01",
    to: "2026-11-30",
    label: "noviembre",
  });
});

test("el largo de cada barra, frente a la más larga", () => {
  expect(barShare(4500, 9000)).toBe(50);
  expect(barShare(9000, 9000)).toBe(100);
  // Una barra chiquita se ve igual
  expect(barShare(10, 9000)).toBe(2);
  expect(barShare(0, 0)).toBe(0);
});
