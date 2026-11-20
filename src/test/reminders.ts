// Lo que miran los avisos en las pruebas: un pedido para mañana (jueves 19, 10:00), un saldo de ayer y Morenita baja
import type { OrderSummary, Receivable } from "@/features/orders";
import type { StockItem } from "@/features/stock";

export const UPCOMING_ORDER: OrderSummary = {
  id: "o1",
  number: 44,
  status: "new",
  fulfillment: "pickup",
  customerName: "Patricia V. (DEMO)",
  itemsSummary: "12 Coquetas",
  totalCents: 14400,
  paidCents: 0,
  promisedAt: "2026-11-19T15:00:00.000Z",
  dueDate: "2026-11-19",
};

export function receivablesPage(withDebt: boolean) {
  const items: Receivable[] = withDebt
    ? [
        {
          id: "o9",
          number: 40,
          customerName: "Jorge P. (DEMO)",
          customerPhone: "+51900000301",
          fulfillment: "pickup",
          status: "delivered",
          totalCents: 2400,
          paidCents: 0,
          dueDate: "2026-11-17",
          scheduledFor: null,
          remind: true,
        },
      ]
    : [];
  const due = items.reduce((sum, item) => sum + item.totalCents - item.paidCents, 0);
  return { items, meta: { limit: 20, total: items.length, hasMore: false, nextCursor: null, totalDueCents: due } };
}

export const morenita = (onHand: number, state: StockItem["state"]): StockItem => ({
  productId: "p1",
  name: "Morenita",
  imageUrl: null,
  linkedToWeb: false,
  minStock: 6,
  onHand,
  reserved: 0,
  physical: onHand,
  coverageDays: 1,
  state,
});
