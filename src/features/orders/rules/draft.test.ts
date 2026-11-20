import type { DraftState } from "../schema/draft";
import { collectionText, draftProblem, toOrderDraft } from "./draft";

const DRAFT: DraftState = {
  quantities: { a: 2, b: 0 },
  phone: "900 000 990",
  name: "Ana (DEMO)",
  fulfillment: "pickup",
  address: "",
  scheduledFor: null,
  promisedTime: "",
  discountCents: 0,
  discountReason: "",
  paymentMode: "none",
  paymentMethod: null,
  paymentCents: 0,
  note: "",
  updatedAt: null,
};
const LINES = [{ productId: "a", quantity: 2 }];
const TOTALS = { subtotalCents: 2400, deliveryFeeCents: 0, totalCents: 2400 };
const problem = (changes: Partial<DraftState>, phone: string | null = "+51900000990", totals = TOTALS) =>
  draftProblem({ ...DRAFT, ...changes }, { phone, hasItems: true, totals });

test("lo que falta para guardar, en el orden del formulario", () => {
  expect(problem({})).toBeNull();
  expect(draftProblem(DRAFT, { phone: "+51900000990", hasItems: false, totals: TOTALS })).toBe(
    "Elige al menos un alfajor.",
  );
  expect(problem({}, null)).toBe("Escribe el celular del cliente: 9 dígitos.");
  expect(problem({ name: "  " })).toBe("Escribe el nombre del cliente.");
  expect(problem({ fulfillment: "delivery" })).toBe("Escribe la dirección de entrega.");
  expect(problem({ promisedTime: "25:00" })).toBe("Escribe la hora como 13:00.");
  expect(problem({ discountCents: 200 })).toBe("Elige el motivo del descuento.");
  expect(problem({ discountCents: 2500, discountReason: "Caja" })).toBe("El descuento no puede pasar del total.");
  expect(problem({ paymentMode: "all" })).toBe("Elige con qué pagó.");
  expect(problem({ paymentMode: "part", paymentMethod: "yape" })).toBe("Escribe cuánto adelantó.");
  expect(problem({ paymentMode: "part", paymentMethod: "yape", paymentCents: 2401 })).toBe(
    "El adelanto no puede pasar del total.",
  );
});

test("el borrador como lo recibe create_order: sin lo vacío, con la hora en el día del pedido", () => {
  expect(toOrderDraft(DRAFT, { phone: "+51900000990", today: "2026-11-19", totalCents: 2400, lines: LINES })).toEqual({
    customer: { phone: "+51900000990", name: "Ana (DEMO)" },
    fulfillment: "pickup",
    lines: LINES,
  });
  const full = {
    ...DRAFT,
    fulfillment: "delivery" as const,
    address: " Jr. Lima 123 ",
    scheduledFor: "2026-11-21",
    promisedTime: "10:30",
    discountCents: 200,
    discountReason: "Caja",
    paymentMode: "all" as const,
    paymentMethod: "yape" as const,
    note: " Sin azúcar ",
  };
  expect(toOrderDraft(full, { phone: "+51900000990", today: "2026-11-19", totalCents: 2700, lines: LINES })).toEqual({
    customer: { phone: "+51900000990", name: "Ana (DEMO)" },
    fulfillment: "delivery",
    deliveryAddress: "Jr. Lima 123",
    scheduledFor: "2026-11-21",
    promisedAt: "2026-11-21T10:30:00-05:00",
    discountCents: 200,
    discountReason: "Caja",
    payment: { method: "yape", amountCents: 2700 },
    note: "Sin azúcar",
    lines: LINES,
  });
  const part = { ...DRAFT, paymentMode: "part" as const, paymentMethod: "cash" as const, paymentCents: 1000 };
  expect(
    toOrderDraft(part, { phone: "+51900000990", today: "2026-11-19", totalCents: 2400, lines: LINES }).payment,
  ).toEqual({
    method: "cash",
    amountCents: 1000,
  });
});

test("cómo queda el cobro, debajo del total", () => {
  const sol = (amount: string) => `S/\u00a0${amount}`;
  expect(collectionText({ ...DRAFT, paymentMode: "all", paymentMethod: "yape" }, 2400)).toBe("Pagado ahora con Yape.");
  expect(collectionText({ ...DRAFT, paymentMode: "part", paymentMethod: "cash", paymentCents: 1000 }, 2400)).toBe(
    `Adelanto de ${sol("10.00")} con Efectivo. Falta ${sol("14.00")}.`,
  );
  expect(collectionText(DRAFT, 2400)).toBe(`Se cobra ${sol("24.00")} al recoger.`);
  expect(collectionText({ ...DRAFT, fulfillment: "delivery" }, 2900)).toBe(`Se cobra ${sol("29.00")} al recibir.`);
});
