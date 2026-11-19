import { orderNumber } from "./number";

test("el número del pedido, con cuatro cifras", () => {
  expect(orderNumber(42)).toBe("#0042");
  expect(orderNumber(12345)).toBe("#12345");
});
