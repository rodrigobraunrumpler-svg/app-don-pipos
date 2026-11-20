import { TEST_ORDER, summaryOf } from "@/test/orders";

import { addPayment, advanceOrder, createOrder, getOrder, getOrderCounts, listOrders, revertStatus } from "./orders";

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
