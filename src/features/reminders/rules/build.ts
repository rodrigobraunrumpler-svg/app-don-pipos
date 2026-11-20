import { addDays, businessDate, businessTime, daysBetween, formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { REMINDER_TIMES } from "../constants";
import type { Debt, Reminder, ReminderData, ReminderSwitches, StockLevel, UpcomingOrder } from "../schema/reminder";

// El pedido de mañana, dicho el día antes («at»). Uno entregado no avisa
function orderReminder(order: UpcomingOrder, at: Date): Reminder | null {
  if (order.status === "delivered") return null;
  const when = order.promisedAt ? `Mañana a las ${formatTime(new Date(order.promisedAt))}` : "Mañana";
  const due = order.totalCents - order.paidCents;
  const how = order.fulfillment === "delivery" ? "para delivery" : "para recoger";
  return {
    id: `order:${order.id}`,
    kind: "scheduled",
    title: `${when}: pedido de ${order.customerName ?? "un cliente"}`,
    body: `${order.itemsSummary} ${how}. ${due > 0 ? `Falta cobrar ${formatCents(due)}.` : "Ya está pagado."}`,
    at,
    target: { screen: "order", orderId: order.id },
  };
}

// El alfajor que se acaba (estado low de Stock), salvo que ya haya avisado hoy
function stockReminder(item: StockLevel, notified: string[]): Reminder | null {
  const id = `stock:${item.productId}`;
  if (item.state !== "low" || notified.includes(id)) return null;
  return {
    id,
    kind: "stock",
    title: `${item.name} se está acabando`,
    body: `${item.onHand === 1 ? "Queda 1" : `Quedan ${item.onHand}`}. Toca para ver cuánto conviene producir.`,
    at: null,
    target: { screen: "production" },
  };
}

// Los saldos de antes de hoy (ya entregados o con adelanto), en un solo aviso, contados al día en que sale («at»). Un
// cliente con varios pedidos cuenta una vez, con todo lo que debe
function balancesReminder(rows: Debt[], today: string, at: Date): Reminder | null {
  const debts = rows.filter((row) => row.remind && row.dueDate < today && row.totalCents > row.paidCents);
  if (debts.length === 0) return null;
  const total = debts.reduce((sum, debt) => sum + debt.totalCents - debt.paidCents, 0);
  const customers = new Set(debts.map((debt) => debt.customerPhone ?? debt.id));
  const base = { id: "balances", kind: "balances", at, target: { screen: "receivables" } } as const;
  if (customers.size > 1)
    return {
      ...base,
      title: `${customers.size} clientes te deben ${formatCents(total)}`,
      body: "Toca para ver quiénes y enviarles un recordatorio.",
    };
  const oldest = debts.reduce((first, debt) => (debt.dueDate < first.dueDate ? debt : first));
  const days = daysBetween(oldest.dueDate, businessDate(at));
  return {
    ...base,
    title: `${oldest.customerName ?? "Un cliente"} te debe ${formatCents(total)}`,
    body: `${days === 1 ? "Desde ayer" : `Desde hace ${days} días`}. Toca para enviarle un recordatorio.`,
  };
}

const byTime = (reminders: (Reminder | null)[]): Reminder[] =>
  reminders.filter((reminder) => reminder !== null).sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));

// Los avisos que se programan en el celular, con lo último que la app supo (docs/spec/reminders.md §5): el pedido a las
// 18:00 del día antes (si esa hora no pasó), el alfajor ahora (una vez por día) y los saldos a las 09:00 (hoy si todavía
// no son, si no mañana). Los de ahora primero y después por hora. Con su interruptor apagado, ninguno de ese tipo
export function buildReminders(data: ReminderData, settings: ReminderSwitches, now: Date): Reminder[] {
  const today = businessDate(now);
  const morning = businessTime(today, REMINDER_TIMES.balances);
  const balancesAt = morning > now ? morning : businessTime(addDays(today, 1), REMINDER_TIMES.balances);
  const orderAt = (order: UpcomingOrder) => businessTime(addDays(order.dueDate, -1), REMINDER_TIMES.scheduled);
  return byTime([
    ...(settings.scheduled
      ? data.upcoming.filter((order) => orderAt(order) > now).map((order) => orderReminder(order, orderAt(order)))
      : []),
    ...(settings.stock ? data.stock.map((item) => stockReminder(item, data.notifiedToday)) : []),
    ...(settings.balances ? [balancesReminder(data.receivables, today, balancesAt)] : []),
  ]);
}

// La campana de Inicio: lo mismo, dicho a hoy. El pedido de mañana (aunque ya pasaron las 18:00), lo que se acaba
// (aunque ya avisó) y quién debe, contado desde hoy
export function listReminders(data: ReminderData, settings: ReminderSwitches, now: Date): Reminder[] {
  const today = businessDate(now);
  const tomorrow = addDays(today, 1);
  return [
    ...(settings.stock ? data.stock.map((item) => stockReminder(item, [])) : []),
    ...(settings.scheduled
      ? data.upcoming.filter((order) => order.dueDate === tomorrow).map((order) => orderReminder(order, now))
      : []),
    ...(settings.balances ? [balancesReminder(data.receivables, today, now)] : []),
  ].filter((reminder) => reminder !== null);
}
