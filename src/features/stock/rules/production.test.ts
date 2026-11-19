import { productionSavedText, productionSaveLabel, productionTotal } from "./production";

test("el total es la suma de lo puesto", () => expect(productionTotal({ a: 36, b: 0, c: 109 })).toBe(145));

test("el botón", () => {
  expect(productionSaveLabel(145)).toBe("Guardar producción: 145 alfajores");
  expect(productionSaveLabel(1)).toBe("Guardar producción: 1 alfajor");
  expect(productionSaveLabel(0)).toBe("Guardar producción");
});

test("lo que dice al guardar", () => {
  expect(productionSavedText(145, [])).toBe("Sumaste 145 alfajores y el stock ya está al día.");
  expect(productionSavedText(1, [])).toBe("Sumaste 1 alfajor y el stock ya está al día.");
  expect(productionSavedText(20, ["Limon Kiss"])).toBe(
    "Sumaste 20 alfajores y el stock ya está al día. Limon Kiss vuelve a aparecer disponible en la web.",
  );
  expect(productionSavedText(30, ["Coqueta", "Limon Kiss", "Pipo Crush"])).toBe(
    "Sumaste 30 alfajores y el stock ya está al día. Coqueta, Limon Kiss y Pipo Crush vuelven a aparecer disponibles en la web.",
  );
});
