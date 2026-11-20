import { getProductionSuggestion, getProductSalesByWeekday } from "./stock";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

const respond = (data: unknown) => mockRpc.mockResolvedValueOnce({ data, error: null });

test("la sugerencia y el gráfico llegan revisados con su esquema", async () => {
  const item = {
    productId: "00000000-0000-4000-8000-000000000a01",
    name: "Coqueta",
    imageUrl: null,
    suggested: 36,
    expected: 43,
    weekdayUnits: 25,
    weekdayDays: 5,
    weekendUnits: 18,
    weekendDays: 2,
    minStock: 6,
    onHand: 13,
  };
  respond({ ready: true, horizonDays: 7, items: [item] });
  await expect(getProductionSuggestion()).resolves.toEqual({ ready: true, horizonDays: 7, items: [item] });
  respond({ ready: true, days: [{ dow: 1, average: 5 }] });
  await expect(getProductSalesByWeekday(item.productId)).resolves.toEqual({
    ready: true,
    days: [{ dow: 1, average: 5 }],
  });
  expect(mockRpc).toHaveBeenLastCalledWith("product_sales_by_weekday", { p_product_id: item.productId });
  respond({ ready: "sí", horizonDays: 7, items: [] });
  await expect(getProductionSuggestion()).rejects.toMatchObject({ kind: "unexpected" });
});
