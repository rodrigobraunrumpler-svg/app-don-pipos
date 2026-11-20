import { getLoyaltyOverview, getLoyaltySettings, updateLoyaltySettings } from "./loyalty";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

const SETTINGS = {
  isActive: true,
  stampUnit: "order",
  goal: 10,
  rewardKind: "discount",
  rewardAmountCents: 1000,
  rewardText: null,
  version: 2,
};

beforeEach(() => mockRpc.mockReset());

test("la fidelidad, cambiarla y «Cerca del premio» llegan revisadas con su esquema", async () => {
  mockRpc.mockResolvedValue({ data: SETTINGS, error: null });
  await expect(getLoyaltySettings()).resolves.toEqual(SETTINGS);
  expect(mockRpc).toHaveBeenLastCalledWith("get_loyalty_settings");
  await updateLoyaltySettings({
    expectedVersion: 2,
    isActive: true,
    stampUnit: "order",
    goal: 10,
    rewardKind: "discount",
    rewardAmountCents: 1000,
    rewardText: null,
  });
  expect(mockRpc).toHaveBeenLastCalledWith("update_loyalty_settings", {
    p_expected_version: 2,
    p_is_active: true,
    p_stamp_unit: "order",
    p_goal: 10,
    p_reward_kind: "discount",
    p_reward_amount_cents: 1000,
    p_reward_text: null,
  });
  const overview = { goal: 10, customers: [{ customerId: "c1", name: "Ana (DEMO)", stamps: 9 }] };
  mockRpc.mockResolvedValue({ data: overview, error: null });
  await expect(getLoyaltyOverview()).resolves.toEqual(overview);
  expect(mockRpc).toHaveBeenLastCalledWith("loyalty_overview", { p_limit: 10 });
  mockRpc.mockResolvedValue({ data: { ...SETTINGS, stampUnit: "box" }, error: null });
  await expect(getLoyaltySettings()).rejects.toMatchObject({ kind: "unexpected" });
});
