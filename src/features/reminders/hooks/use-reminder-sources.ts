import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/features/businesses";
import { receivablesQuery, upcomingOrdersQuery } from "@/features/orders";
import { stockOverviewQuery } from "@/features/stock";

// Lo que miran los avisos: los interruptores, los 50 pedidos que vienen más próximos, la primera página de Por cobrar y
// el stock.
// Por cobrar y el stock son las consultas de Inicio y Pedidos; los pedidos que vienen se piden aparte, por día.
// Cada parte queda vacía mientras no llega
export function useReminderSources() {
  return {
    settings: useQuery(businessQuery).data?.settings.reminders,
    upcoming: useQuery(upcomingOrdersQuery).data,
    receivables: useInfiniteQuery(receivablesQuery).data?.pages[0]?.items,
    stock: useQuery(stockOverviewQuery).data,
  };
}
