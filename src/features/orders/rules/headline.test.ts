import { TEST_ORDER } from "@/test/orders";

import { orderHeadline } from "./headline";

// El jueves 19 de noviembre de 2026, 11:40 en Lima
const NOW = new Date("2026-11-19T16:40:00.000Z");

test("debajo del número: quién, cómo se entrega y qué día", () => {
  expect(orderHeadline(TEST_ORDER, NOW)).toBe("Ana (DEMO), delivery hoy");
  expect(orderHeadline({ ...TEST_ORDER, fulfillment: "pickup", dueDate: "2026-11-21" }, NOW)).toBe(
    "Ana (DEMO), recoge en el local el sábado 21",
  );
  expect(orderHeadline({ ...TEST_ORDER, dueDate: "2026-11-18" }, NOW)).toBe("Ana (DEMO), delivery ayer");
  expect(orderHeadline({ ...TEST_ORDER, customerName: null }, NOW)).toBe("Cliente, delivery hoy");
  expect(orderHeadline({ ...TEST_ORDER, fulfillment: "counter", customerName: null }, NOW)).toBe(
    "Venta en el mostrador, hoy",
  );
});
