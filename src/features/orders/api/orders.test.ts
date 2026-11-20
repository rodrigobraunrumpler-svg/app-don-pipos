import { TEST_ORDER, summaryOf } from "@/test/orders";

import {
  addPayment,
  advanceOrder,
  cancelOrder,
  changePaymentMethod,
  createOrder,
  editOrder,
  getOrder,
  getOrderCounts,
  listOrders,
  listReceivables,
  revertCancel,
  revertEdit,
  revertStatus,
} from "./orders";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

const respond = (data: unknown, error: unknown = null) => mockRpc.mockResolvedValueOnce({ data, error });

test("un pedido llega revisado con su esquema", async () => {
  respond(TEST_ORDER);
  await expect(getOrder(TEST_ORDER.id)).resolves.toEqual(TEST_ORDER);
  expect(mockRpc).toHaveBeenLastCalledWith("get_order", { p_order_id: TEST_ORDER.id });
});

test("una respuesta que no calza es una falla inesperada", async () => {
  respond({ ...TEST_ORDER, status: "perdido" });
  await expect(getOrder(TEST_ORDER.id)).rejects.toMatchObject({ kind: "unexpected" });
});

test("la lista pide su filtro, la búsqueda y el cursor; las cantidades llegan revisadas", async () => {
  respond({ items: [summaryOf(TEST_ORDER)], meta: { limit: 20, total: 1, hasMore: false, nextCursor: null } });
  await expect(listOrders({ filter: "today", search: "ana", cursor: "42" })).resolves.toMatchObject({
    meta: { total: 1 },
  });
  expect(mockRpc).toHaveBeenLastCalledWith("list_orders", { p_filter: "today", p_search: "ana", p_cursor: "42" });
  respond({ today: 1, toDeliver: 1, upcoming: 0, toCollect: 1 });
  await expect(getOrderCounts()).rejects.toMatchObject({ kind: "unexpected" });
});

test("crear, avanzar, deshacer y cobrar mandan lo que pide cada función", async () => {
  const draft = { customer: { phone: "+51900000990", name: "Ana (DEMO)" }, fulfillment: "pickup" as const, lines: [] };
  respond(TEST_ORDER);
  await createOrder({ requestId: "r1", draft });
  expect(mockRpc).toHaveBeenLastCalledWith("create_order", { p_request_id: "r1", p_draft: draft });
  respond(TEST_ORDER);
  await advanceOrder({ orderId: TEST_ORDER.id, fromStatus: "new" });
  expect(mockRpc).toHaveBeenLastCalledWith("advance_order", { p_order_id: TEST_ORDER.id, p_from_status: "new" });
  respond(TEST_ORDER);
  await revertStatus({ orderId: TEST_ORDER.id, expectedStatus: "preparing" });
  expect(mockRpc).toHaveBeenLastCalledWith("revert_status", {
    p_order_id: TEST_ORDER.id,
    p_expected_status: "preparing",
  });
  respond(null, { code: "P0001", message: "conflict" });
  await expect(
    addPayment({ requestId: "r2", orderId: TEST_ORDER.id, method: "cash", amountCents: 2200 }),
  ).rejects.toMatchObject({
    kind: "conflict",
  });
  expect(mockRpc).toHaveBeenLastCalledWith("add_payment", {
    p_request_id: "r2",
    p_order_id: TEST_ORDER.id,
    p_method: "cash",
    p_amount_cents: 2200,
  });
});

test("editar, anular, deshacer y cambiar el medio mandan lo que pide cada función", async () => {
  const lines = [{ productId: "00000000-0000-4000-8000-000000000a01", quantity: 2 }];
  respond(TEST_ORDER);
  await editOrder({ requestId: "r1", orderId: TEST_ORDER.id, expectedVersion: 1, lines, refund: null });
  // Sin devolución: 0 y sin medio (la base no mira el medio si no se devuelve nada)
  expect(mockRpc).toHaveBeenLastCalledWith("edit_order", {
    p_request_id: "r1",
    p_order_id: TEST_ORDER.id,
    p_expected_version: 1,
    p_lines: lines,
    p_refund_cents: 0,
    p_refund_method: "",
  });
  respond(TEST_ORDER);
  await cancelOrder({
    requestId: "r2",
    orderId: TEST_ORDER.id,
    reason: "Sin stock",
    refund: { cents: 1000, method: "cash" },
  });
  expect(mockRpc).toHaveBeenLastCalledWith("cancel_order", {
    p_request_id: "r2",
    p_order_id: TEST_ORDER.id,
    p_reason: "Sin stock",
    p_refund_cents: 1000,
    p_refund_method: "cash",
  });
  respond(TEST_ORDER);
  await revertEdit({ orderId: TEST_ORDER.id, version: 3 });
  expect(mockRpc).toHaveBeenLastCalledWith("revert_edit", { p_order_id: TEST_ORDER.id, p_version: 3 });
  respond(TEST_ORDER);
  await revertCancel(TEST_ORDER.id);
  expect(mockRpc).toHaveBeenLastCalledWith("revert_cancel", { p_order_id: TEST_ORDER.id });
  respond(TEST_ORDER);
  await changePaymentMethod({ requestId: "r3", paymentId: "00000000-0000-4000-8000-0000000000e1", method: "yape" });
  expect(mockRpc).toHaveBeenLastCalledWith("change_payment_method", {
    p_request_id: "r3",
    p_payment_id: "00000000-0000-4000-8000-0000000000e1",
    p_method: "yape",
  });
});

test("Por cobrar llega revisado, con lo que deben en total", async () => {
  const item = {
    id: TEST_ORDER.id,
    number: 42,
    customerName: "Ana (DEMO)",
    customerPhone: "+51900000990",
    fulfillment: "delivery",
    status: "delivered",
    totalCents: 4200,
    paidCents: 2000,
    dueDate: "2026-11-19",
    scheduledFor: null,
    remind: true,
  };
  respond({ items: [item], meta: { limit: 20, total: 1, hasMore: false, nextCursor: null, totalDueCents: 2200 } });
  await expect(listReceivables({ cursor: "43" })).resolves.toMatchObject({ meta: { totalDueCents: 2200 } });
  expect(mockRpc).toHaveBeenLastCalledWith("list_receivables", { p_cursor: "43" });
  respond({
    items: [{ ...item, remind: "sí" }],
    meta: { limit: 20, total: 1, hasMore: false, nextCursor: null, totalDueCents: 2200 },
  });
  await expect(listReceivables({ cursor: null })).rejects.toMatchObject({ kind: "unexpected" });
});
