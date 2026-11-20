import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { ordersKeys } from "../queries/keys";
import {
  addPaymentMutation,
  advanceOrderMutation,
  createCounterSaleMutation,
  createOrderMutation,
  revertStatusMutation,
} from "../queries/mutations";
import { nextStatus } from "../rules/status";
import type { Order } from "../schema/order";
import { INVALIDATES, keepOrder as keep, orderScope } from "./order-cache";

// Crear, vender y cobrar esperan la respuesta («Guardando…»). Crear y vender no van en fila: la base ya los ordena
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({ ...createOrderMutation, meta: { invalidates: INVALIDATES }, onSuccess: keep(queryClient) });
}

export function useCreateCounterSale() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createCounterSaleMutation,
    meta: { invalidates: INVALIDATES },
    onSuccess: keep(queryClient),
  });
}

export function useAddPayment(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...addPaymentMutation,
    scope: orderScope(orderId),
    meta: { invalidates: INVALIDATES },
    onSuccess: keep(queryClient),
  });
}

// Avanzar y deshacer se ven al instante en el pedido y vuelven atrás si la base no lo guarda (§14.2)
async function showNow(queryClient: QueryClient, orderId: string, change: (order: Order) => Order) {
  const key = ordersKeys.detail(orderId);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<Order>(key);
  if (previous) queryClient.setQueryData(key, change(previous));
  return { previous };
}

export function useAdvanceOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...advanceOrderMutation,
    scope: orderScope(orderId),
    meta: { invalidates: INVALIDATES },
    onMutate: ({ orderId }) =>
      showNow(queryClient, orderId, (order) => {
        const status = nextStatus(order.fulfillment, order.status);
        if (!status) return order;
        const at = new Date().toISOString();
        return {
          ...order,
          status,
          deliveredAt: status === "delivered" ? at : order.deliveredAt,
          timeline: [...order.timeline, { status, at }],
        };
      }),
    onError: (_error, { orderId }, context) => queryClient.setQueryData(ordersKeys.detail(orderId), context?.previous),
    onSuccess: keep(queryClient),
  });
}

export function useRevertStatus(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...revertStatusMutation,
    scope: orderScope(orderId),
    meta: { invalidates: INVALIDATES },
    onMutate: ({ orderId }) =>
      showNow(queryClient, orderId, (order) => {
        const previous = order.timeline.at(-2);
        if (!previous) return order;
        return {
          ...order,
          status: previous.status,
          deliveredAt: order.status === "delivered" ? null : order.deliveredAt,
          timeline: order.timeline.slice(0, -1),
        };
      }),
    onError: (_error, { orderId }, context) => queryClient.setQueryData(ordersKeys.detail(orderId), context?.previous),
    onSuccess: keep(queryClient),
  });
}
