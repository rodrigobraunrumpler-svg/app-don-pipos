import {
  deliveryLabel,
  lapsedLabel,
  methodsLabel,
  productionLabel,
  productionNote,
  remindersLabel,
} from "./settings-labels";

test("las filas de Más dicen cada ajuste en pocas palabras (docs/spec/businesses.md §5)", () => {
  expect(productionLabel(1)).toBe("Cada día");
  expect(productionLabel(7)).toBe("Cada 7 días");
  expect(deliveryLabel(500)).toBe("S/ 5.00");
  expect(deliveryLabel(0)).toBe("Sin costo");
  expect(methodsLabel(["cash", "yape", "plin"])).toBe("3");
  expect(lapsedLabel(30)).toBe("30 días");
});

test("la nota de Producción y cuántos recordatorios están activos", () => {
  expect(productionNote(1)).toBe("Produces todos los días: Inicio y Stock sugieren para ese periodo.");
  expect(productionNote(7)).toBe("Cada 7 días: Inicio y Stock sugieren para ese periodo.");
  expect(remindersLabel({ scheduled: true, stock: true, balances: true })).toBe("3 activos");
  expect(remindersLabel({ scheduled: false, stock: true, balances: false })).toBe("1 activo");
  expect(remindersLabel({ scheduled: false, stock: false, balances: false })).toBe("Apagados");
});
