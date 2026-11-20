import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AppError } from "@/lib/errors";
import { createTestQueryClient } from "@/test/render";

import { useCompleteSetup } from "./use-complete-setup";

const mockComplete = jest.fn();
jest.mock("../api/business", () => ({ completeSetup: (input: unknown) => mockComplete(input) }));

const INPUT = { requestId: "r1", stock: [{ productId: "p1", counted: 3 }], categories: [] };

async function run() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = await renderHook(() => useCompleteSetup(), { wrapper });
  let outcome: unknown;
  await act(async () => {
    outcome = await result.current.mutateAsync(INPUT).catch((error: unknown) => error);
  });
  return outcome;
}

test("terminar la puesta en marcha la guarda una vez", async () => {
  mockComplete.mockResolvedValue({ adjustments: 1, categories: 0 });
  await expect(run()).resolves.toEqual({ alreadyDone: false });
  expect(mockComplete).toHaveBeenCalledWith(INPUT);
});

test("si ya estaba hecha (conflict: otro celular, o la app se cerró en «Todo listo»), sigue como hecha", async () => {
  mockComplete.mockRejectedValue(new AppError("conflict"));
  await expect(run()).resolves.toEqual({ alreadyDone: true });
  mockComplete.mockRejectedValue(new AppError("offline"));
  await expect(run()).resolves.toMatchObject({ kind: "offline" });
});
