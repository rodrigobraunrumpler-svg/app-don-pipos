// Más → Ingresos → un pago abre su pedido, y la flecha vuelve paso a paso, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import Reports from "@/app/(main)/(tabs)/reports";
import IncomeScreen from "@/app/(main)/income/index";
import NewIncome from "@/app/(main)/income/new";
import OrderScreen from "@/app/(main)/orders/[id]";
import { TEST_ORDER } from "@/test/orders";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/auth", () => ({ AccountSection: () => null }));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [] }));
jest.mock("@/features/expenses/api/expenses", () => ({
  listExpenseCategories: async () => [],
  getExpensesSummary: async () => ({ totalCents: 0, byCategory: [] }),
}));
jest.mock("@/features/income/api/income", () => ({
  getIncomeSummary: async () => ({
    totalCents: 2400,
    byMethod: { cash: 0, yape: 2400, plin: 0, transfer: 0 },
    byDay: [],
  }),
  listIncome: async () => ({
    items: [
      {
        kind: "payment",
        id: "p1",
        at: new Date().toISOString(),
        amountCents: 2400,
        method: "yape",
        orderId: "00000000-0000-4000-8000-0000000000f1",
        orderNumber: 42,
        customerName: "Ana (DEMO)",
        description: null,
      },
    ],
    meta: { limit: 20, total: 1, hasMore: false, nextCursor: null },
  }),
}));
jest.mock("@/features/orders/api/orders", () => ({
  listReceivables: async () => ({
    items: [],
    meta: { limit: 20, total: 0, hasMore: false, nextCursor: null, totalDueCents: 0 },
  }),
  getOrder: async () => (jest.requireActual("@/test/orders") as { TEST_ORDER: unknown }).TEST_ORDER,
}));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 500, version: 1 },
  }),
}));
jest.mock("@/features/messages/api/templates", () => ({ listTemplates: async () => [] }));
jest.mock("@/features/reports/api/reports", () => ({
  getReportSummary: async () => ({
    incomeCents: 2400,
    expensesCents: 0,
    profitCents: 2400,
    previous: { incomeCents: 0, expensesCents: 0, profitCents: 0 },
    bars: [],
    byMethod: { cash: 0, yape: 2400, plin: 0, transfer: 0 },
  }),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

const ROUTES = { reports: Reports, "income/index": IncomeScreen, "income/new": NewIncome, "orders/[id]": OrderScreen };

test("Reportes → Ingresos → el pago de un pedido abre el pedido; atrás vuelve a Ingresos y a Reportes", async () => {
  await renderRouter(ROUTES, { initialUrl: "/reports", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: /^Ingresos S\/\s[\d,.]+ .*Ver la lista/ }));
  expect(screen).toHavePathname("/income");
  await fireEvent.press(await screen.findByRole("button", { name: /^Pedido #0042/ }));
  expect(await screen.findByText("Pedido #0042")).toBeOnTheScreen();
  expect(screen).toHavePathname(`/orders/${TEST_ORDER.id}`);
  await act(() => router.back());
  expect(screen).toHavePathname("/income");
  await fireEvent.press(screen.getByRole("button", { name: "Anotar ingreso" }));
  expect(screen).toHavePathname("/income/new");
  await act(() => router.back());
  await act(() => router.back());
  expect(screen).toHavePathname("/reports");
});
