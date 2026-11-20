import { getExportRows, getHomeSummary, getRanking, getReportSummary } from "./reports";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

const byMethod = { cash: 2400, yape: 0, plin: 0, transfer: 700 };

test("las cuatro lecturas llegan revisadas con su esquema y con sus parámetros", async () => {
  const home = {
    collectedTodayCents: 3100,
    collectedByMethod: byMethod,
    deliveredToday: 2,
    toDeliver: 1,
    receivablesCents: 1200,
    cashClosedToday: false,
  };
  mockRpc.mockResolvedValueOnce({ data: home, error: null });
  await expect(getHomeSummary()).resolves.toEqual(home);
  expect(mockRpc).toHaveBeenLastCalledWith("home_summary");

  const totals = { incomeCents: 3100, expensesCents: 300, profitCents: 2800 };
  const summary = {
    ...totals,
    previous: totals,
    bars: [{ from: "2026-11-16", to: "2026-11-16", incomeCents: 2400, expensesCents: 0 }],
    byMethod,
  };
  mockRpc.mockResolvedValueOnce({ data: summary, error: null });
  await expect(getReportSummary({ from: "2026-11-16", to: "2026-11-18", previousFrom: "2026-11-09" })).resolves.toEqual(
    summary,
  );
  expect(mockRpc).toHaveBeenLastCalledWith("report_summary", {
    p_from: "2026-11-16",
    p_to: "2026-11-18",
    p_previous_from: "2026-11-09",
  });

  const ranking = { products: [], channels: { whatsapp: 2, local: 1, web: 0 }, topCustomers: [] };
  mockRpc.mockResolvedValueOnce({ data: ranking, error: null });
  await expect(getRanking("2026-11-01", "2026-11-18")).resolves.toEqual(ranking);
  expect(mockRpc).toHaveBeenLastCalledWith("report_ranking", { p_from: "2026-11-01", p_to: "2026-11-18" });

  mockRpc.mockResolvedValueOnce({ data: [{ kind: "gift", at: "x" }], error: null });
  await expect(getExportRows("2026-11-01", "2026-11-18")).rejects.toMatchObject({ kind: "unexpected" });
  expect(mockRpc).toHaveBeenLastCalledWith("export_rows", { p_from: "2026-11-01", p_to: "2026-11-18" });
});
