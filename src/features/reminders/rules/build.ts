import { addDays, businessDate, businessTime, daysBetween, formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { REMINDER_TIMES } from "../constants";
import type { Debt, Reminder, ReminderData, ReminderSwitches, StockLevel, UpcomingOrder } from "../schema/reminder";

// El pedido para otro día: a las 18:00 del día antes, si esa hora no pasó y todavía no se entregó
function orderReminder(order: UpcomingOrder, now: Date): Reminder | null {
  const at = businessTime(addDays(order.dueDate, -1), REMINDER_TIMES.scheduled);
  if (order.status === "delivered" || at <= now) return null;
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

// El alfajor que se acaba (estado low de Stock): ahora, salvo que ya haya avisado hoy
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

// Los saldos de ayer o antes (ya entregados o con adelanto), en un solo aviso a las 09:00: hoy si todavía no son, si no
// mañana. Un cliente con varios pedidos cuenta una vez, con todo lo que debe
function balancesReminder(rows: Debt[], now: Date): Reminder | null {
  const today = businessDate(now);
  const debts = rows.filter((row) => row.remind && row.dueDate < today && row.totalCents > row.paidCents);
  if (debts.length === 0) return null;
  const morning = businessTime(today, REMINDER_TIMES.balances);
  const at = morning > now ? morning : businessTime(addDays(today, 1), REMINDER_TIMES.balances);
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

// Los avisos del celular con lo último que la app supo (docs/spec/reminders.md §5): los de ahora primero y después por
// hora. Con su interruptor apagado, ninguno de ese tipo
export function buildReminders(data: ReminderData, settings: ReminderSwitches, now: Date): Reminder[] {
  const reminders = [
    ...(settings.scheduled ? data.upcoming.map((order) => orderReminder(order, now)) : []),
    ...(settings.stock ? data.stock.map((item) => stockReminder(item, data.notifiedToday)) : []),
    ...(settings.balances ? [balancesReminder(data.receivables, now)] : []),
  ].filter((reminder) => reminder !== null);
  return reminders.sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
}
