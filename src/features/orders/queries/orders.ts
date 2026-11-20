import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import {
  getOrder,
  getOrderCounts,
  listCustomerOrders,
  listOrders,
  listReceivables,
  listUpcomingOrders,
} from "../api/orders";
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

// Por cobrar, por páginas de 20 (del número mayor al menor)
export const receivablesQuery = infiniteQueryOptions({
  queryKey: ordersKeys.receivables,
  queryFn: ({ pageParam }) => listReceivables({ cursor: pageParam }),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
  staleTime: STALE_TIME.live,
});

// Los pedidos que vienen, del más próximo al más lejano: los mira el recordatorio del celular y la campana de Inicio
export const upcomingOrdersQuery = queryOptions({
  queryKey: ordersKeys.upcoming,
  queryFn: listUpcomingOrders,
  staleTime: STALE_TIME.live,
});

// Los pedidos de un cliente, para su ficha
export const customerOrdersQuery = (customerId: string) =>
  infiniteQueryOptions({
    queryKey: ordersKeys.customer(customerId),
    queryFn: ({ pageParam }) => listCustomerOrders({ customerId, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    staleTime: STALE_TIME.live,
  });
