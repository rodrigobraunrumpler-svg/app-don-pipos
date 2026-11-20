import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { lateness, latenessLabel, orderNumber, ordersQuery } from "@/features/orders";
import { stockLine, stockOverviewQuery } from "@/features/stock";

import { urgentRows, type LateOrder, type UrgentRow } from "../rules/urgent";

// Lo urgente de Inicio, con las mismas consultas que «Por entregar» y «Tu stock» (no pide nada aparte).
// ponytail: mira la primera página de «Por entregar» (20 pedidos, como Pedidos); si hay más, una fila lleva a Pedidos
export function useUrgentRows(now: Date): UrgentRow[] {
  const toDeliver = useInfiniteQuery(ordersQuery("to_deliver", "")).data;
  const stock = useQuery(stockOverviewQuery).data;
  const orders = toDeliver?.pages.flatMap((page) => page.items) ?? [];
  const more = Math.max(0, (toDeliver?.pages[0]?.meta.total ?? 0) - orders.length);
  const late = orders.flatMap((order): LateOrder[] => {
    const value = lateness(order, now);
    if (!value) return [];
    return [
      {
        id: order.id,
        number: orderNumber(order.number),
        customerName: order.customerName,
        fulfillment: order.fulfillment,
        promisedAt: order.promisedAt,
        dueDate: order.dueDate,
        lateness: value.kind,
        label: latenessLabel(value, now),
      },
    ];
  });
  return urgentRows(
    late,
    (stock ?? []).map((item) => ({ ...item, line: stockLine(item, now) })),
    more,
  );
}
