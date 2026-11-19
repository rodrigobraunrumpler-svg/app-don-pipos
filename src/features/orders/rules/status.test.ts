import { nextStatus, nextStatusLabel } from "./status";

test.each([
  ["delivery", "new", "preparing"],
  ["delivery", "preparing", "on_the_way"],
  ["delivery", "on_the_way", "delivered"],
  ["pickup", "preparing", "ready"],
  ["pickup", "ready", "delivered"],
] as const)("%s: %s → %s", (fulfillment, status, next) => expect(nextStatus(fulfillment, status)).toBe(next));

test.each([
  ["delivery", "delivered"],
  ["pickup", "cancelled"],
  ["counter", "delivered"],
  ["delivery", "ready"],
] as const)("%s en %s no tiene siguiente", (fulfillment, status) => expect(nextStatus(fulfillment, status)).toBeNull());

test("el botón dice a dónde va", () => {
  expect(nextStatusLabel("preparing")).toBe("Empezar a preparar");
  expect(nextStatusLabel("on_the_way")).toBe("Marcar en camino");
  expect(nextStatusLabel("ready")).toBe("Marcar listo para recoger");
  expect(nextStatusLabel("delivered")).toBe("Marcar entregado");
  expect(nextStatusLabel("new")).toBe("");
});
