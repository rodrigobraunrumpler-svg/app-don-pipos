import { getCashExpected, getLatestCashCount } from "./cash";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

test("sin cierre llega null; lo de un día llega revisado con su esquema", async () => {
  mockRpc.mockResolvedValueOnce({ data: null, error: null });
  await expect(getLatestCashCount("2026-11-19")).resolves.toBeNull();
  expect(mockRpc).toHaveBeenCalledWith("latest_cash_count", { p_business_date: "2026-11-19" });
  const expected = {
    businessDate: "2026-11-19",
    cashInCents: 6300,
    cashOutCents: 6900,
    otherMethods: { yape: 2400, plin: 2000, transfer: 1000 },
    lastOpeningCents: 5000,
  };
  mockRpc.mockResolvedValueOnce({ data: expected, error: null });
  await expect(getCashExpected("2026-11-19")).resolves.toEqual(expected);
  mockRpc.mockResolvedValueOnce({ data: { ...expected, cashInCents: null }, error: null });
  await expect(getCashExpected("2026-11-19")).rejects.toMatchObject({ kind: "unexpected" });
});
