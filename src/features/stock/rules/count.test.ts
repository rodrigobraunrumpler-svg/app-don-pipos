import { countSaveLabel, differenceLabel, expectedLabel } from "./count";

// Con 11 libres y 2 apartados, debería haber 13 en la nevera
test("se contaron 13: igual", () => expect(differenceLabel(13, 13)).toBe("Igual"));
test("se contaron 12: −1", () => expect(differenceLabel(12, 13)).toBe("−1"));
test("se contaron 15: +2", () => expect(differenceLabel(15, 13)).toBe("+2"));

test("lo que debería haber", () => {
  expect(expectedLabel(11, 2)).toBe("Deberías tener 13 en la nevera (11 libres y 2 apartados para pedidos)");
  expect(expectedLabel(1, 1)).toBe("Deberías tener 2 en la nevera (1 libre y 1 apartado para pedidos)");
  expect(expectedLabel(11, 0)).toBe("Deberías tener 11 en la nevera");
});

test("con lo libre en negativo, lo que hay está todo apartado; y nunca pide menos de 0", () => {
  expect(expectedLabel(-14, 24)).toBe("Deberías tener 10 en la nevera (todos apartados para pedidos)");
  expect(expectedLabel(-2, 0)).toBe("Deberías tener 0 en la nevera");
  expect(expectedLabel(-5, 3)).toBe("Deberías tener 0 en la nevera");
});

test("el botón", () => {
  expect(countSaveLabel(0)).toBe("Sin diferencias");
  expect(countSaveLabel(1)).toBe("Guardar 1 ajuste");
  expect(countSaveLabel(3)).toBe("Guardar 3 ajustes");
});
