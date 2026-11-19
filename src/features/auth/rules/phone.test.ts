import { formatPhone, phoneDigits } from "./phone";

test("el número se muestra con espacios", () => {
  expect(formatPhone("+51900000901")).toBe("+51 900 000 901");
});

test("lo que no es un número de Perú se muestra tal cual", () => {
  expect(formatPhone("otro")).toBe("otro");
});

test("de lo escrito quedan solo las 9 cifras del celular", () => {
  expect(phoneDigits("900 000-901")).toBe("900000901");
  expect(phoneDigits("+51 900 000 901")).toBe("900000901");
  expect(phoneDigits("9000009012")).toBe("900000901");
});
