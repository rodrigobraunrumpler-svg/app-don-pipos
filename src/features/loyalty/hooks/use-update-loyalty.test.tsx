import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { createTestQueryClient } from "@/test/render";

import { loyaltyKeys } from "../queries/keys";
import type { LoyaltySettings } from "../schema/loyalty";
import { useUpdateLoyaltySettings } from "./use-update-loyalty";

const mockUpdate = jest.fn();
jest.mock("../api/loyalty", () => ({ updateLoyaltySettings: (input: unknown) => mockUpdate(input) }));

const OFF: LoyaltySettings = {
  isActive: false,
  stampUnit: "order",
  goal: 10,
  rewardKind: "free_item",
  rewardAmountCents: null,
  rewardText: null,
  version: 1,
};

test("guardar la fidelidad deja al instante lo que devuelve la base (la pantalla no vuelve a «apagada»)", async () => {
  const client = createTestQueryClient();
  client.setQueryData(loyaltyKeys.settings, OFF);
  mockUpdate.mockResolvedValue({ ...OFF, isActive: true, version: 2 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = await renderHook(() => useUpdateLoyaltySettings(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ ...OFF, isActive: true, expectedVersion: 1 });
  });
  expect(client.getQueryData<LoyaltySettings>(loyaltyKeys.settings)).toMatchObject({ isActive: true, version: 2 });
});
