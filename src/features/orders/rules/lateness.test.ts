import { lateness, latenessLabel } from "./lateness";

// Hoy es miércoles 18 de noviembre de 2026 en Lima
const at = (iso: string) => new Date(iso);
const order = (overrides: object) =>
  ({ status: "new", fulfillment: "delivery", dueDate: "2026-11-18", promisedAt: null, ...overrides }) as Parameters<
    typeof lateness
  >[0];

test("recoge a las 11:30, son las 11:40, preparando → 10 min tarde", () => {
  const late = lateness(
    order({ status: "preparing", fulfillment: "pickup", promisedAt: "2026-11-18T16:30:00.000Z" }),
    at("2026-11-18T16:40:00Z"),
  );
  expect(late).toEqual({ kind: "late", minutes: 10 });
  expect(latenessLabel(late, at("2026-11-18T16:40:00Z"))).toBe("10 min tarde");
});
test("el mismo pedido, ya listo → no va tarde", () =>
  expect(
    lateness(
      order({ status: "ready", fulfillment: "pickup", promisedAt: "2026-11-18T16:30:00.000Z" }),
      at("2026-11-18T16:40:00Z"),
    ),
  ).toBeNull());
test("delivery a las 13:00, son las 13:05, en camino → 5 min tarde", () =>
  expect(
    lateness(order({ status: "on_the_way", promisedAt: "2026-11-18T18:00:00.000Z" }), at("2026-11-18T18:05:00Z")),
  ).toEqual({ kind: "late", minutes: 5 }));
test("de ayer y sin entregar → atrasado desde ayer", () => {
  const late = lateness(order({ dueDate: "2026-11-17" }), at("2026-11-18T16:40:00Z"));
  expect(late).toEqual({ kind: "overdue", since: "2026-11-17" });
  expect(latenessLabel(late, at("2026-11-18T16:40:00Z"))).toBe("Atrasado desde ayer");
});
test("del lunes → atrasado desde el lunes; de hace más de una semana, con su fecha", () => {
  expect(
    latenessLabel(lateness(order({ dueDate: "2026-11-16" }), at("2026-11-18T16:40:00Z")), at("2026-11-18T16:40:00Z")),
  ).toBe("Atrasado desde el lunes");
  expect(
    latenessLabel(lateness(order({ dueDate: "2026-11-09" }), at("2026-11-18T16:40:00Z")), at("2026-11-18T16:40:00Z")),
  ).toBe("Atrasado desde el 9 nov");
});
test("para otro día, o de hoy sin hora acordada → no va tarde", () => {
  expect(lateness(order({ dueDate: "2026-11-20" }), at("2026-11-18T16:40:00Z"))).toBeNull();
  expect(lateness(order({}), at("2026-11-18T23:00:00Z"))).toBeNull();
});
test("el día es el de Lima: a las 04:00 UTC del 19 todavía es el 18 en Lima", () =>
  expect(lateness(order({ dueDate: "2026-11-18" }), at("2026-11-19T04:00:00Z"))).toBeNull());
test("entregado o anulado nunca va tarde", () => {
  expect(lateness(order({ status: "delivered", dueDate: "2026-11-10" }), at("2026-11-18T16:40:00Z"))).toBeNull();
  expect(lateness(order({ status: "cancelled", dueDate: "2026-11-10" }), at("2026-11-18T16:40:00Z"))).toBeNull();
  expect(latenessLabel(null, at("2026-11-18T16:40:00Z"))).toBe("");
});

test("de hoy, con la hora acordada todavía por llegar → no va tarde", () =>
  expect(lateness(order({ status: "preparing", promisedAt: "2026-11-18T18:00:00.000Z" }), at("2026-11-18T17:30:00Z"))).toBeNull());
