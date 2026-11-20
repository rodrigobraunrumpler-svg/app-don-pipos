import { urgentRows } from "./urgent";

const stock = (name: string, state: string, line: string, onHand = 0, coverageDays: number | null = null) => ({
  productId: name,
  name,
  state,
  line,
  onHand,
  coverageDays,
});
const order = {
  id: "o44",
  number: "#0044",
  customerName: "Ana (DEMO)",
  fulfillment: "pickup",
  promisedAt: "2026-11-18T16:30:00.000Z",
  lateness: "late" as const,
  label: "10 min tarde",
};

test("lo urgente de Inicio, en su orden: lo atrasado y tarde, agotado, revisar y lo que se acaba (la maqueta)", () => {
  const rows = urgentRows(
    [
      {
        ...order,
        id: "o37",
        number: "#0037",
        customerName: "Rosa (DEMO)",
        promisedAt: null,
        lateness: "overdue",
        label: "Atrasado desde ayer",
      },
      order,
    ],
    [
      stock("Morenita", "low", "Alcanza hasta mañana", 4, 1),
      stock("Coqueta", "ok", "Alcanza para más de una semana", 30, 9),
      stock("Pipo Crush", "check", "2 vendidos de más: cuenta y ajusta", -2),
      stock("Limon Kiss", "out", "Sin stock"),
      stock("Manteadita", "owed", "Faltan 14 para pedidos: produce", -14),
    ],
  );
  expect(rows.map((row) => [row.id, row.kind, row.title, row.detail])).toEqual([
    ["o37", "late", "#0037 de Rosa (DEMO) está atrasado desde ayer", "Márcalo o avísale"],
    ["o44", "late", "#0044 de Ana (DEMO) va 10 min tarde", "Recoge a las 11:30: márcalo o avísale"],
    ["Limon Kiss", "out", "Limon Kiss está agotado", "Registrar producción"],
    ["Manteadita", "owed", "Manteadita no alcanza para los pedidos", "Faltan 14 para pedidos: produce"],
    ["Pipo Crush", "check", "Revisa el stock de Pipo Crush", "2 vendidos de más: cuenta y ajusta"],
    ["Morenita", "low", "Morenita alcanza hasta mañana", "Registrar producción"],
  ]);
});

test("un delivery sin cliente y lo que se acaba sin historia, que dice cuántos quedan", () => {
  const rows = urgentRows(
    [
      {
        ...order,
        customerName: null,
        fulfillment: "delivery",
        promisedAt: "2026-11-18T17:00:00.000Z",
        label: "5 min tarde",
      },
    ],
    [stock("Morenita", "low", "Mínimo 6", 4)],
  );
  expect(rows.map((row) => [row.title, row.detail])).toEqual([
    ["#0044 va 5 min tarde", "Entrega a las 12:00: márcalo o avísale"],
    ["Morenita se está acabando: quedan 4", "Registrar producción"],
  ]);
});
