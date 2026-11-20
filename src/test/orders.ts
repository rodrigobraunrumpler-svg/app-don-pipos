// Un pedido de ejemplo para las pruebas, con la forma que devuelve la base (fechas como texto ISO)
import type { Order, OrderSummary } from "@/features/orders";

import { COQUETA_ID } from "./stock-items";

export const PIPO_ID = "00000000-0000-4000-8000-000000000a05";

export const TEST_ORDER: Order = {
  id: "00000000-0000-4000-8000-0000000000f1",
  number: 42,
  status: "new",
  fulfillment: "delivery",
  channel: "whatsapp",
  customerId: "00000000-0000-4000-8000-0000000000c1",
  customerName: "Ana (DEMO)",
  promisedAt: null,
  scheduledFor: null,
  dueDate: "2026-11-19",
  deliveryAddress: "Jr. Lima 123",
  deliveryFeeCents: 500,
  discountCents: 0,
  discountReason: null,
  subtotalCents: 3700,
  totalCents: 4200,
  paidCents: 2000,
  deliveredAt: null,
  note: null,
  itemsSummary: "2 Coquetas, 1 Pipo Crush",
  itemsCount: 3,
  version: 1,
  createdAt: "2026-11-19T14:30:00.000Z",
  lines: [
    { productId: COQUETA_ID, productName: "Coqueta", quantity: 2, unitPriceCents: 1200 },
    { productId: PIPO_ID, productName: "Pipo Crush", quantity: 1, unitPriceCents: 1300 },
  ],
  payments: [
    {
      id: "00000000-0000-4000-8000-0000000000e1",
      kind: "payment",
      method: "yape",
      amountCents: 2000,
      paidAt: "2026-11-19T14:30:00.000Z",
      voidedAt: null,
    },
  ],
  timeline: [{ status: "new", at: "2026-11-19T14:30:00.000Z" }],
  customer: { id: "00000000-0000-4000-8000-0000000000c1", name: "Ana (DEMO)", phone: "+51900000990", address: "Jr. Lima 123" },
};

export function summaryOf(order: Order): OrderSummary {
  const { id, number, status, fulfillment, customerName, itemsSummary, totalCents, paidCents, promisedAt, dueDate } = order;
  return { id, number, status, fulfillment, customerName, itemsSummary, totalCents, paidCents, promisedAt, dueDate };
}
