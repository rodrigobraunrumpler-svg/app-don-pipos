import { TEST_ORDER } from "@/test/orders";

import { messageContext } from "./message";

const ALL = ["cash", "yape", "plin", "transfer"] as const;
// Los montos llevan un espacio que no se corta entre «S/» y la cifra (formatCents)
const sol = (amount: string) => `S/\u00a0${amount}`;

test("los datos del pedido para los mensajes de WhatsApp (contexto de la maqueta)", () => {
  expect(messageContext(TEST_ORDER, [...ALL])).toEqual({
    nombre: "Ana",
    numero: "#0042",
    detalle: "2 Coquetas, 1 Pipo Crush",
    total: sol("42.00"),
    falta: sol("22.00"),
    adelanto: `Recibimos tu adelanto de ${sol("20.00")}; faltan ${sol("22.00")}.`,
    entrega: "Te avisamos cuando salga.",
    pago: `Total a pagar: ${sol("22.00")} (Yape, Plin, transferencia o efectivo).`,
    sellos: "",
  });
});

test("los sellos del mensaje de entregado los arma quien llama (loyalty)", () => {
  expect(messageContext(TEST_ORDER, ["cash"], "Llevas 7 de 10 sellos para tu premio.").sellos).toBe(
    "Llevas 7 de 10 sellos para tu premio.",
  );
});

test("pagado, para recoger otro día con hora, y solo con los medios activos", () => {
  const paid = {
    ...TEST_ORDER,
    fulfillment: "pickup" as const,
    paidCents: 4200,
    scheduledFor: "2026-11-21",
    promisedAt: "2026-11-21T15:00:00.000Z",
  };
  const context = messageContext(paid, ["yape", "cash"]);
  expect(context.adelanto).toBe("Ya está pagado.");
  expect(context.pago).toBe("Ya está pagado.");
  expect(context.entrega).toBe("Lo entregamos el sábado 21 de noviembre, a las 10:00.");
  const pickup = messageContext({ ...TEST_ORDER, fulfillment: "pickup", paidCents: 0 }, ["yape", "cash"]);
  expect(pickup.adelanto).toBe("");
  expect(pickup.entrega).toBe("Te avisamos cuando esté listo para recoger.");
  expect(pickup.pago).toBe(`Total a pagar: ${sol("42.00")} (Yape o efectivo).`);
});

test("sin hora, de mostrador, con un solo medio o sin ajustes, y el nombre del pedido si no hay cliente", () => {
  const later = messageContext({ ...TEST_ORDER, scheduledFor: "2026-11-21", promisedAt: null }, ["cash"]);
  expect(later.entrega).toBe("Lo entregamos el sábado 21 de noviembre.");
  expect(later.pago).toBe(`Total a pagar: ${sol("22.00")} (efectivo).`);
  expect(messageContext(TEST_ORDER, []).pago).toBe(
    `Total a pagar: ${sol("22.00")} (Yape, Plin, transferencia o efectivo).`,
  );
  const counter = messageContext({ ...TEST_ORDER, fulfillment: "counter", customer: null, customerName: null }, [
    "cash",
  ]);
  expect(counter.entrega).toBe("");
  expect(counter.nombre).toBe("");
  expect(messageContext({ ...TEST_ORDER, customer: null, customerName: "Luis Q. (DEMO)" }, ["cash"]).nombre).toBe(
    "Luis",
  );
});
