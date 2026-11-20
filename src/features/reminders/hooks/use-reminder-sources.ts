import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/features/businesses";
import { ordersQuery, receivablesQuery } from "@/features/orders";
import { stockOverviewQuery } from "@/features/stock";

// Lo que miran los avisos: los interruptores, la primera página de los próximos pedidos y la de Por cobrar, y el stock.
// Son las mismas consultas de Inicio y Pedidos: no piden nada de más. Cada parte queda vacía mientras no llega
export function useReminderSources() {
  return {
    settings: useQuery(businessQuery).data?.settings.reminders,
    upcoming: useInfiniteQuery(ordersQuery("upcoming", "")).data?.pages[0]?.items,
    receivables: useInfiniteQuery(receivablesQuery).data?.pages[0]?.items,
    stock: useQuery(stockOverviewQuery).data,
  };
}
