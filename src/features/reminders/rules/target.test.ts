import { targetHref } from "./target";

test("cada aviso abre su pantalla", () => {
  expect(targetHref({ screen: "order", orderId: "o1" })).toBe("/orders/o1");
  expect(targetHref({ screen: "production" })).toBe("/stock/production");
  expect(targetHref({ screen: "receivables" })).toBe("/orders/receivables");
});
