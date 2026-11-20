import { toAppError } from "@/lib/errors";
import { pageSchema, type Page } from "@/lib/page";
import { parseResponse } from "@/lib/parse";
import { supabase } from "@/lib/supabase";

import {
  orderCountsSchema,
  orderSchema,
  orderSummarySchema,
  type Order,
  type OrderCounts,
  type OrderDraft,
  type OrderFilter,
  type OrderLineInput,
  type OrderStatus,
  type OrderSummary,
  type PaymentMethod,
  type ReceivablesPage,
  type RefundInput,
  receivablesPageSchema,
} from "../schema/order";

// Cada función de la base responde un pedido entero o avisa con su código (docs/spec/README.md, «Errores»)
async function orderFrom(request: PromiseLike<{ data: unknown; error: unknown }>): Promise<Order> {
  const { data, error } = await request;
  if (error) throw toAppError(error);
  return parseResponse(orderSchema, data);
}

// Una página de la lista, del número mayor al menor. El cursor lo da la página anterior
export async function listOrders(input: {
  filter: OrderFilter;
  search: string | null;
  cursor: string | null;
}): Promise<Page<OrderSummary>> {
  const { data, error } = await supabase().rpc("list_orders", {
    p_filter: input.filter,
    p_search: input.search ?? undefined,
    p_cursor: input.cursor ?? undefined,
  });
  if (error) throw toAppError(error);
  return parseResponse(pageSchema(orderSummarySchema), data);
}

export async function getOrderCounts(): Promise<OrderCounts> {
  const { data, error } = await supabase().rpc("order_counts");
  if (error) throw toAppError(error);
  return parseResponse(orderCountsSchema, data);
}

export const getOrder = (orderId: string) => orderFrom(supabase().rpc("get_order", { p_order_id: orderId }));

export const createOrder = (input: { requestId: string; draft: OrderDraft }) =>
  orderFrom(supabase().rpc("create_order", { p_request_id: input.requestId, p_draft: input.draft }));

export const createCounterSale = (input: { requestId: string; items: OrderLineInput[]; method: PaymentMethod }) =>
  orderFrom(
    supabase().rpc("create_counter_sale", {
      p_request_id: input.requestId,
      p_items: input.items,
      p_method: input.method,
    }),
  );

export const advanceOrder = (input: { orderId: string; fromStatus: OrderStatus }) =>
  orderFrom(supabase().rpc("advance_order", { p_order_id: input.orderId, p_from_status: input.fromStatus }));

export const revertStatus = (input: { orderId: string; expectedStatus: OrderStatus }) =>
  orderFrom(supabase().rpc("revert_status", { p_order_id: input.orderId, p_expected_status: input.expectedStatus }));

export const addPayment = (input: { requestId: string; orderId: string; method: PaymentMethod; amountCents: number }) =>
  orderFrom(
    supabase().rpc("add_payment", {
      p_request_id: input.requestId,
      p_order_id: input.orderId,
      p_method: input.method,
      p_amount_cents: input.amountCents,
    }),
  );

// Sin devolución se manda 0 y ningún medio: la base no mira el medio si no se devuelve nada
const refundArgs = (refund: RefundInput) => ({
  p_refund_cents: refund?.cents ?? 0,
  p_refund_method: refund?.method ?? "",
});

export const editOrder = (input: {
  requestId: string;
  orderId: string;
  expectedVersion: number;
  lines: OrderLineInput[];
  refund: RefundInput;
}) =>
  orderFrom(
    supabase().rpc("edit_order", {
      p_request_id: input.requestId,
      p_order_id: input.orderId,
      p_expected_version: input.expectedVersion,
      p_lines: input.lines,
      ...refundArgs(input.refund),
    }),
  );

export const revertEdit = (input: { orderId: string; version: number }) =>
  orderFrom(supabase().rpc("revert_edit", { p_order_id: input.orderId, p_version: input.version }));

export const cancelOrder = (input: { requestId: string; orderId: string; reason: string; refund: RefundInput }) =>
  orderFrom(
    supabase().rpc("cancel_order", {
      p_request_id: input.requestId,
      p_order_id: input.orderId,
      p_reason: input.reason,
      ...refundArgs(input.refund),
    }),
  );

export const revertCancel = (orderId: string) => orderFrom(supabase().rpc("revert_cancel", { p_order_id: orderId }));

export const changePaymentMethod = (input: { requestId: string; paymentId: string; method: PaymentMethod }) =>
  orderFrom(
    supabase().rpc("change_payment_method", {
      p_request_id: input.requestId,
      p_payment_id: input.paymentId,
      p_method: input.method,
    }),
  );

// Por cobrar, por páginas: el cursor lo da la página anterior
// Los pedidos de un cliente, del más nuevo al más viejo, de 20 en 20 (list_customer_orders)
export async function listCustomerOrders(input: {
  customerId: string;
  cursor: string | null;
}): Promise<Page<OrderSummary>> {
  const { data, error } = await supabase().rpc("list_customer_orders", {
    p_customer_id: input.customerId,
    p_cursor: input.cursor ?? undefined,
  });
  if (error) throw toAppError(error);
  return parseResponse(pageSchema(orderSummarySchema), data);
}

export async function listReceivables(input: { cursor: string | null }): Promise<ReceivablesPage> {
  const { data, error } = await supabase().rpc("list_receivables", { p_cursor: input.cursor ?? undefined });
  if (error) throw toAppError(error);
  return parseResponse(receivablesPageSchema, data);
}
