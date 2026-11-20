import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AppError } from "@/lib/errors";
import { TEST_BUSINESS } from "@/test/business";
import { createTestQueryClient } from "@/test/render";

import { businessesKeys } from "../queries/keys";
import type { Business } from "../schema/business";
import { useUpdateSettings } from "./use-update-settings";

const mockUpdate = jest.fn();
jest.mock("../api/business", () => ({
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(businessesKeys.all, TEST_BUSINESS);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const settings = () => client.getQueryData<Business>(businessesKeys.all)?.settings;
  return { client, wrapper, settings };
}

test("un interruptor cambia al instante y después queda lo que devolvió la base", async () => {
  const { wrapper, settings } = setup();
  let answer: (value: unknown) => void = () => undefined;
  mockUpdate.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const { result } = await renderHook(() => useUpdateSettings(), { wrapper });
  await act(async () => {
    result.current.mutate({ activePaymentMethods: ["cash", "yape"] });
  });
  expect(mockUpdate).toHaveBeenCalledWith(1, { activePaymentMethods: ["cash", "yape"] });
  expect(settings()?.activePaymentMethods).toEqual(["cash", "yape"]);
  await act(async () => answer({ ...TEST_BUSINESS.settings, activePaymentMethods: ["cash", "yape"], version: 2 }));
  expect(settings()).toMatchObject({ activePaymentMethods: ["cash", "yape"], version: 2 });
});

test("si otro cambio llegó antes (conflict), vuelve a como estaba", async () => {
  const { wrapper, settings } = setup();
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  const { result } = await renderHook(() => useUpdateSettings(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ deliveryFeeCents: 900 }).catch(() => undefined);
  });
  expect(settings()).toEqual(TEST_BUSINESS.settings);
});
