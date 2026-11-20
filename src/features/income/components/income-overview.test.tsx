import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { IncomeOverview } from "./income-overview";

const at = new Date().toISOString();
const mockVoid = jest.fn();
jest.mock("../api/income", () => ({
  getIncomeSummary: async () => ({
    totalCents: 3900,
    byMethod: { cash: 1500, yape: 2400, plin: 0, transfer: 0 },
    byDay: [],
  }),
  listIncome: async () => ({
    items: [
      {
        ...mockBase,
        kind: "payment",
        id: "p1",
        amountCents: 2400,
        method: "yape",
        orderId: "o1",
        orderNumber: 42,
        customerName: "Ana (DEMO)",
      },
      {
        ...mockBase,
        kind: "refund",
        id: "p2",
        amountCents: 2000,
        method: "cash",
        orderId: "o1",
        orderNumber: 42,
        customerName: "Ana (DEMO)",
      },
      {
        ...mockBase,
        kind: "manual",
        id: "m1",
        amountCents: 1500,
        method: "cash",
        description: "Venta a un café (DEMO)",
      },
    ],
    meta: { limit: 20, total: 3, hasMore: false, nextCursor: null },
  }),
  voidManualIncome: (input: unknown) => mockVoid(input),
}));
const mockBase = { at, orderId: null, orderNumber: null, customerName: null, description: null };

beforeEach(() => mockVoid.mockReset().mockResolvedValue({}));

test("lo cobrado en el mes por medio, y cada ingreso con su origen: un pago abre su pedido", async () => {
  const onOpenOrder = jest.fn();
  await renderWithProviders(<IncomeOverview onBack={jest.fn()} onNew={jest.fn()} onOpenOrder={onOpenOrder} />);
  expect(await screen.findByText("S/ 39.00")).toBeOnTheScreen();
  expect(screen.getByText(/^Cobrado en /)).toBeOnTheScreen();
  expect(screen.getByText("Yape")).toBeOnTheScreen();
  expect(screen.queryByText("Plin")).toBeNull();
  expect(await screen.findByText("Pedido #0042, Ana (DEMO)")).toBeOnTheScreen();
  expect(screen.getByText("Devolución, pedido #0042")).toBeOnTheScreen();
  expect(screen.getByText("−S/ 20.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: /^Pedido #0042/ }));
  expect(onOpenOrder).toHaveBeenCalledWith("o1");
});

test("un ingreso a mano se anula desde su hoja", async () => {
  await renderWithProviders(<IncomeOverview onBack={jest.fn()} onNew={jest.fn()} onOpenOrder={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Venta a un café/ }));
  expect(screen.getByText("Deja de contar en los ingresos y en la caja. Nada se borra.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Anular ingreso" }));
  await waitFor(() => expect(mockVoid).toHaveBeenCalledWith({ id: "m1", reason: "Anulado por el dueño" }));
  expect(await screen.findByText("Ingreso anulado")).toBeOnTheScreen();
});
