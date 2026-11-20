import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AppError } from "@/lib/errors";
import { TEST_ORDER } from "@/test/orders";
import { createTestQueryClient } from "@/test/render";

import { useAdvanceOrder, useRevertStatus } from "./use-order-changes";

const mockAdvance = jest.fn();
const mockRevert = jest.fn();
jest.mock("../api/orders", () => ({
  advanceOrder: (input: unknown) => mockAdvance(input),
  revertStatus: (input: unknown) => mockRevert(input),
}));

const KEY = ["orders", "detail", TEST_ORDER.id];

async function setup<T>(hook: () => T) {
  const client = createTestQueryClient();
  client.setQueryData(KEY, TEST_ORDER);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = await renderHook(hook, { wrapper });
  return { client, result };
}

test("avanzar se ve al instante en el pedido y vuelve atrás si falla", async () => {
  let reject: (error: unknown) => void = () => undefined;
  mockAdvance.mockImplementationOnce(() => new Promise((_resolve, fail) => (reject = fail)));
  const { client, result } = await setup(() => useAdvanceOrder(TEST_ORDER.id));
  await act(() => void result.current.mutate({ orderId: TEST_ORDER.id, fromStatus: "new" }));
  await waitFor(() => expect(client.getQueryData<typeof TEST_ORDER>(KEY)?.status).toBe("preparing"));
  expect(client.getQueryData<typeof TEST_ORDER>(KEY)?.timeline.map((event) => event.status)).toEqual([
    "new",
    "preparing",
  ]);
  await act(() => reject(new AppError("offline")));
  await waitFor(() => expect(client.getQueryData<typeof TEST_ORDER>(KEY)?.status).toBe("new"));
});

test("deshacer vuelve al estado anterior al instante, y queda lo que responde la base", async () => {
  const preparing = {
    ...TEST_ORDER,
    status: "preparing" as const,
    timeline: [...TEST_ORDER.timeline, { status: "preparing" as const, at: "2026-11-19T14:40:00.000Z" }],
  };
  let resolve: (order: unknown) => void = () => undefined;
  mockRevert.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
  const { client, result } = await setup(() => useRevertStatus(TEST_ORDER.id));
  client.setQueryData(KEY, preparing);
  await act(() => void result.current.mutate({ orderId: TEST_ORDER.id, expectedStatus: "preparing" }));
  await waitFor(() => expect(client.getQueryData<typeof TEST_ORDER>(KEY)?.status).toBe("new"));
  expect(client.getQueryData<typeof TEST_ORDER>(KEY)?.timeline).toHaveLength(1);
  await act(() => resolve({ ...TEST_ORDER, version: 3 }));
  await waitFor(() => expect(client.getQueryData<typeof TEST_ORDER>(KEY)?.version).toBe(3));
});

test("un «Deshacer» espera al cambio de su pedido, no a los de otro pedido", async () => {
  mockAdvance.mockImplementationOnce(() => new Promise(() => undefined));
  mockRevert.mockResolvedValue(TEST_ORDER);
  const { result } = await setup(() => ({
    advanceA: useAdvanceOrder("pedido-a"),
    undoA: useRevertStatus("pedido-a"),
    undoB: useRevertStatus("pedido-b"),
  }));
  await act(() => void result.current.advanceA.mutate({ orderId: "pedido-a", fromStatus: "new" }));
  await act(() => {
    result.current.undoA.mutate({ orderId: "pedido-a", expectedStatus: "preparing" });
    result.current.undoB.mutate({ orderId: "pedido-b", expectedStatus: "preparing" });
  });
  await waitFor(() => expect(mockRevert).toHaveBeenCalledWith({ orderId: "pedido-b", expectedStatus: "preparing" }));
  expect(mockRevert).not.toHaveBeenCalledWith({ orderId: "pedido-a", expectedStatus: "preparing" });
});
