import { receivableReason } from "./receivable";

// El jueves 19 de noviembre de 2026, 11:40 en Lima
const NOW = new Date("2026-11-19T16:40:00.000Z");
const base = { status: "new" as const, fulfillment: "pickup" as const, paidCents: 0, scheduledFor: null };

test("por qué le deben, en la fila de Por cobrar (la maqueta)", () => {
  expect(receivableReason({ ...base, status: "delivered", fulfillment: "delivery" }, NOW)).toBe(
    "Entregado, quedó debiendo",
  );
  expect(receivableReason({ ...base, paidCents: 2000, scheduledFor: "2026-11-21" }, NOW)).toBe(
    "Adelanto de S/ 20.00, entrega el sábado 21",
  );
  expect(receivableReason({ ...base, paidCents: 2000, scheduledFor: "2026-11-20" }, NOW)).toBe(
    "Adelanto de S/ 20.00, entrega mañana",
  );
  expect(receivableReason({ ...base, paidCents: 1000 }, NOW)).toBe("Adelanto de S/ 10.00");
  expect(receivableReason(base, NOW)).toBe("Se cobra al recoger");
  expect(receivableReason({ ...base, fulfillment: "delivery" }, NOW)).toBe("Se cobra al entregar");
});
