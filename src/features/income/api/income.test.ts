import { createManualIncome, getIncomeSummary } from "./income";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

test("un ingreso de hoy va sin día; el resumen llega revisado con su esquema", async () => {
  const income = {
    id: "00000000-0000-4000-8000-00000000f201",
    description: "Venta a un café (DEMO)",
    amountCents: 1500,
    method: "cash",
    receivedAt: "2026-11-19T14:10:00.000Z",
    voidedAt: null,
  };
  mockRpc.mockResolvedValueOnce({ data: income, error: null });
  await expect(
    createManualIncome({
      requestId: "r1",
      description: income.description,
      amountCents: 1500,
      method: "cash",
      receivedOn: null,
    }),
  ).resolves.toEqual(income);
  expect(mockRpc).toHaveBeenCalledWith("create_manual_income", {
    p_request_id: "r1",
    p_description: income.description,
    p_amount_cents: 1500,
    p_method: "cash",
    p_received_on: null,
  });
  mockRpc.mockResolvedValueOnce({ data: { totalCents: 1900, byMethod: { cash: 1900 }, byDay: [] }, error: null });
  await expect(getIncomeSummary({ from: "2026-11-01", to: "2026-11-19" })).rejects.toMatchObject({
    kind: "unexpected",
  });
});
