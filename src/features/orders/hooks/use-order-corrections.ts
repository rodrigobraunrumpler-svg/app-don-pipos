import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  cancelOrderMutation,
  changePaymentMethodMutation,
  editOrderMutation,
  revertCancelMutation,
  revertEditMutation,
} from "../queries/mutations";
import { INVALIDATES, keepOrder, orderScope } from "./order-cache";

// Corregir un pedido: editar, anular, cambiar el medio de un pago y sus «Deshacer». Esperan la respuesta (la hoja dice
// «Guardando…») y van en la fila de su pedido
export function useEditOrder(orderId: string) {
  const queryClient = useQueryClient();
  const options = { scope: orderScope(orderId), meta: { invalidates: INVALIDATES }, onSuccess: keepOrder(queryClient) };
  return useMutation({ ...editOrderMutation, ...options });
}

export function useRevertEdit(orderId: string) {
  const queryClient = useQueryClient();
  const options = { scope: orderScope(orderId), meta: { invalidates: INVALIDATES }, onSuccess: keepOrder(queryClient) };
  return useMutation({ ...revertEditMutation, ...options });
}

export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient();
  const options = { scope: orderScope(orderId), meta: { invalidates: INVALIDATES }, onSuccess: keepOrder(queryClient) };
  return useMutation({ ...cancelOrderMutation, ...options });
}

export function useRevertCancel(orderId: string) {
  const queryClient = useQueryClient();
  const options = { scope: orderScope(orderId), meta: { invalidates: INVALIDATES }, onSuccess: keepOrder(queryClient) };
  return useMutation({ ...revertCancelMutation, ...options });
}

export function useChangePaymentMethod(orderId: string) {
  const queryClient = useQueryClient();
  const options = { scope: orderScope(orderId), meta: { invalidates: INVALIDATES }, onSuccess: keepOrder(queryClient) };
  return useMutation({ ...changePaymentMethodMutation, ...options });
}
