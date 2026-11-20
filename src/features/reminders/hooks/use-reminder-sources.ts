import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { businessQuery } from "@/features/businesses";
import { receivablesQuery, upcomingOrdersQuery } from "@/features/orders";
import { stockOverviewQuery } from "@/features/stock";

// Lo que miran los avisos: los interruptores, los 50 pedidos que vienen más próximos, la primera página de Por cobrar y
// el stock. Por cobrar y el stock son las consultas de Inicio y Pedidos; los pedidos que vienen se piden aparte, por
// día. Cada parte queda vacía mientras no llega. «settled»: cada una ya respondió (con datos o con un error); sin señal
// y sin nada guardado no responde, y lo programado antes queda como está
export function useReminderSources() {
  const upcoming = useQuery(upcomingOrdersQuery);
  const receivables = useInfiniteQuery(receivablesQuery);
  const stock = useQuery(stockOverviewQuery);
  return {
    settings: useQuery(businessQuery).data?.settings.reminders,
    upcoming: upcoming.data,
    receivables: receivables.data?.pages[0]?.items,
    stock: stock.data,
    settled: [upcoming, receivables, stock].every((query) => query.data !== undefined || query.status === "error"),
  };
}
