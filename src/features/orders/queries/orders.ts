import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getOrder, getOrderCounts, listOrders } from "../api/orders";
import type { OrderFilter } from "../schema/order";
import { ordersKeys } from "./keys";

// La lista por páginas: pide la siguiente con el cursor de la anterior (§14.3). La búsqueda vacía es «sin búsqueda»
export const ordersQuery = (filter: OrderFilter, search: string) =>
  infiniteQueryOptions({
    queryKey: ordersKeys.list(filter, search),
    queryFn: ({ pageParam }) => listOrders({ filter, search: search || null, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    staleTime: STALE_TIME.live,
  });

export const orderCountsQuery = queryOptions({
  queryKey: ordersKeys.counts,
  queryFn: getOrderCounts,
  staleTime: STALE_TIME.live,
});

// El pedido entero. Una fila de la lista no sirve de dato inicial (no trae líneas, pagos ni estados): la fila lo pide
// al apretarla, y cada función que escribe deja aquí el pedido que devuelve
export const orderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
    staleTime: STALE_TIME.live,
  });
