import { iconFor } from "./category";

test("el ícono de un tipo: el suyo si la app lo conoce; si no, el de «otros»", () => {
  expect(iconFor("moped")).toBe("moped");
  expect(iconFor("cohete")).toBe("receipt-text-outline");
});
