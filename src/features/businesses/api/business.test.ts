import { TEST_BUSINESS } from "@/test/business";

import { completeSetup, getBusiness, updateSettings } from "./business";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

beforeEach(() => mockRpc.mockReset());

test("el negocio llega con todos sus ajustes y si falta la puesta en marcha", async () => {
  mockRpc.mockResolvedValue({ data: { ...TEST_BUSINESS, setupDone: false }, error: null });
  await expect(getBusiness()).resolves.toEqual({ ...TEST_BUSINESS, setupDone: false });
  expect(mockRpc).toHaveBeenLastCalledWith("get_business");
  mockRpc.mockResolvedValue({
    data: { ...TEST_BUSINESS, settings: { ...TEST_BUSINESS.settings, reminders: {} } },
    error: null,
  });
  await expect(getBusiness()).rejects.toMatchObject({ kind: "unexpected" });
});

test("cambiar ajustes manda solo lo que cambia, con la versión que se tenía", async () => {
  const saved = { ...TEST_BUSINESS.settings, deliveryFeeCents: 700, version: 2 };
  mockRpc.mockResolvedValue({ data: saved, error: null });
  await expect(updateSettings(1, { deliveryFeeCents: 700 })).resolves.toEqual(saved);
  expect(mockRpc).toHaveBeenLastCalledWith("update_settings", {
    p_expected_version: 1,
    p_patch: { deliveryFeeCents: 700 },
  });
});

test("la puesta en marcha manda el stock y los tipos de gasto con su código", async () => {
  mockRpc.mockResolvedValue({ data: { adjustments: 1, categories: 2 }, error: null });
  const stock = [{ productId: "p1", counted: 4 }];
  const categories = [{ name: "Insumos", icon: "basket-outline" }];
  await expect(completeSetup({ requestId: "r1", stock, categories })).resolves.toEqual({
    adjustments: 1,
    categories: 2,
  });
  expect(mockRpc).toHaveBeenLastCalledWith("complete_setup", {
    p_request_id: "r1",
    p_stock: stock,
    p_categories: categories,
  });
});
