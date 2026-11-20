import type { Debt, ReminderData, StockLevel, UpcomingOrder } from "../schema/reminder";
import { buildReminders } from "./build";

const ALL_ON = { scheduled: true, stock: true, balances: true };
// Miércoles 18 de noviembre de 2026 en Lima (UTC−5)
const WED_1140 = new Date("2026-11-18T16:40:00.000Z");
const WED_0800 = new Date("2026-11-18T13:00:00.000Z");
const WED_1900 = new Date("2026-11-19T00:00:00.000Z");

const ORDER: UpcomingOrder = {
  id: "o1",
  status: "new",
  fulfillment: "pickup",
  customerName: "Patricia V. (DEMO)",
  itemsSummary: "12 Coquetas, 12 Morenitas",
  totalCents: 28800,
  paidCents: 15000,
  promisedAt: "2026-11-19T15:00:00.000Z",
  dueDate: "2026-11-19",
};
const LOW: StockLevel = { productId: "p1", name: "Morenita", onHand: 6, state: "low" };
const DEBT: Debt = {
  id: "o9",
  customerName: "Jorge P. (DEMO)",
  customerPhone: "+51900000301",
  totalCents: 2400,
  paidCents: 0,
  dueDate: "2026-11-17",
  remind: true,
};
const data = (changes: Partial<ReminderData>): ReminderData => ({
  upcoming: [],
  stock: [],
  receivables: [],
  notifiedStock: [],
  ...changes,
});

test("un pedido para el jueves a las 10:00, visto el miércoles a las 11:40 → un aviso el miércoles a las 18:00", () => {
  expect(buildReminders(data({ upcoming: [ORDER] }), ALL_ON, WED_1140)).toEqual([
    {
      id: "order:o1",
      kind: "scheduled",
      title: "Mañana a las 10:00: pedido de Patricia V. (DEMO)",
      body: "12 Coquetas, 12 Morenitas para recoger. Falta cobrar S/ 138.00.",
      at: new Date("2026-11-18T23:00:00.000Z"),
      target: { screen: "order", orderId: "o1" },
    },
  ]);
});

test("sin hora, para delivery, pagado y con días de anticipación", () => {
  const order = {
    ...ORDER,
    promisedAt: null,
    fulfillment: "delivery" as const,
    paidCents: 28800,
    dueDate: "2026-11-21",
  };
  const [reminder] = buildReminders(data({ upcoming: [order] }), ALL_ON, WED_1140);
  expect(reminder).toMatchObject({
    title: "Mañana: pedido de Patricia V. (DEMO)",
    body: "12 Coquetas, 12 Morenitas para delivery. Ya está pagado.",
    at: new Date("2026-11-20T23:00:00.000Z"),
  });
  const [unnamed] = buildReminders(data({ upcoming: [{ ...ORDER, customerName: null }] }), ALL_ON, WED_1140);
  expect(unnamed?.title).toBe("Mañana a las 10:00: pedido de un cliente");
});

test("no avisa a una hora que ya pasó, ni de un pedido entregado", () => {
  expect(buildReminders(data({ upcoming: [ORDER] }), ALL_ON, WED_1900)).toEqual([]);
  expect(buildReminders(data({ upcoming: [{ ...ORDER, status: "delivered" }] }), ALL_ON, WED_1140)).toEqual([]);
});

test("un alfajor que se acaba avisa ahora, una vez por día", () => {
  expect(buildReminders(data({ stock: [LOW] }), ALL_ON, WED_1140)).toEqual([
    {
      id: "stock:p1",
      kind: "stock",
      title: "Morenita se está acabando",
      body: "Quedan 6. Toca para ver cuánto conviene producir.",
      at: null,
      target: { screen: "production" },
    },
  ]);
  expect(buildReminders(data({ stock: [LOW], notifiedStock: ["p1"] }), ALL_ON, WED_1140)).toEqual([]);
  const [one] = buildReminders(data({ stock: [{ ...LOW, onHand: 1 }] }), ALL_ON, WED_1140);
  expect(one?.body).toBe("Queda 1. Toca para ver cuánto conviene producir.");
  const others = [
    { ...LOW, state: "ok" },
    { ...LOW, state: "out", onHand: 0 },
  ];
  expect(buildReminders(data({ stock: others }), ALL_ON, WED_1140)).toEqual([]);
});

test("un saldo desde ayer: hoy a las 09:00 si todavía no son; si no, mañana", () => {
  expect(buildReminders(data({ receivables: [DEBT] }), ALL_ON, WED_0800)).toEqual([
    {
      id: "balances",
      kind: "balances",
      title: "Jorge P. (DEMO) te debe S/ 24.00",
      body: "Desde ayer. Toca para enviarle un recordatorio.",
      at: new Date("2026-11-18T14:00:00.000Z"),
      target: { screen: "receivables" },
    },
  ]);
  const [later] = buildReminders(data({ receivables: [DEBT] }), ALL_ON, WED_1140);
  expect(later).toMatchObject({
    at: new Date("2026-11-19T14:00:00.000Z"),
    body: "Desde hace 2 días. Toca para enviarle un recordatorio.",
  });
});

test("los saldos van en un solo aviso, sumados por cliente", () => {
  const debts = [
    DEBT,
    { ...DEBT, id: "o10", totalCents: 3600, paidCents: 1200, dueDate: "2026-11-15" },
    { ...DEBT, id: "o11", customerName: null, customerPhone: null, totalCents: 1200 },
  ];
  expect(buildReminders(data({ receivables: debts }), ALL_ON, WED_0800)).toMatchObject([
    { title: "2 clientes te deben S/ 60.00", body: "Toca para ver quiénes y enviarles un recordatorio." },
  ]);
  const third = { ...DEBT, id: "o12", totalCents: 1200, dueDate: "2026-11-16" };
  const [same] = buildReminders(data({ receivables: [...debts.slice(0, 2), third] }), ALL_ON, WED_0800);
  expect(same).toMatchObject({
    title: "Jorge P. (DEMO) te debe S/ 60.00",
    body: "Desde hace 3 días. Toca para enviarle un recordatorio.",
  });
  const [unnamed] = buildReminders(data({ receivables: [debts[2]!] }), ALL_ON, WED_0800);
  expect(unnamed?.title).toBe("Un cliente te debe S/ 12.00");
});

test("un saldo de hoy, sin «recordar» o ya pagado no avisa", () => {
  const rows = [
    { ...DEBT, dueDate: "2026-11-18" },
    { ...DEBT, remind: false },
    { ...DEBT, paidCents: 2400 },
  ];
  expect(buildReminders(data({ receivables: rows }), ALL_ON, WED_0800)).toEqual([]);
});

test("con su interruptor apagado no hay avisos de ese tipo; lo de ahora va primero", () => {
  const everything = data({ upcoming: [ORDER], stock: [LOW], receivables: [DEBT] });
  expect(buildReminders(everything, ALL_ON, WED_0800).map((reminder) => reminder.id)).toEqual([
    "stock:p1",
    "balances",
    "order:o1",
  ]);
  expect(buildReminders(everything, { scheduled: false, stock: false, balances: false }, WED_0800)).toEqual([]);
  expect(buildReminders(everything, { ...ALL_ON, stock: false }, WED_0800).map((reminder) => reminder.kind)).toEqual([
    "balances",
    "scheduled",
  ]);
});
