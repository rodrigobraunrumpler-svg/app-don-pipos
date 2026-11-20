// Más → Reportes → Alfajores → atrás, y Más → Exportar a Excel, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import More from "@/app/(main)/(tabs)/more";
import Reports from "@/app/(main)/reports/index";
import Ranking from "@/app/(main)/reports/ranking";
import { businessDate } from "@/lib/dates";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/auth", () => ({ AccountSection: () => null }));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [] }));
jest.mock("@/features/expenses/api/expenses", () => ({
  listExpenseCategories: async () => [],
  getExpensesSummary: async () => ({ totalCents: 0, byCategory: [] }),
}));
jest.mock("@/features/income/api/income", () => ({
  getIncomeSummary: async () => ({ totalCents: 0, byMethod: { cash: 0, yape: 0, plin: 0, transfer: 0 }, byDay: [] }),
}));
jest.mock("@/features/cash/api/cash", () => ({ getLatestCashCount: async () => null }));
jest.mock("@/features/orders/api/orders", () => ({
  listReceivables: async () => ({
    items: [],
    meta: { limit: 20, total: 0, hasMore: false, nextCursor: null, totalDueCents: 0 },
  }),
}));
const mockRanking = jest.fn();
jest.mock("@/features/reports/api/reports", () => {
  const { businessDate: day } = jest.requireActual("@/lib/dates");
  const today = day(new Date());
  return {
    getReportSummary: async () => ({
      incomeCents: 2400,
      expensesCents: 300,
      profitCents: 2100,
      previous: { incomeCents: 0, expensesCents: 0, profitCents: 0 },
      bars: [{ from: today, to: today, incomeCents: 2400, expensesCents: 300 }],
      byMethod: { cash: 2400, yape: 0, plin: 0, transfer: 0 },
    }),
    getRanking: async (from: string, to: string) => {
      mockRanking(from, to);
      return {
        products: [
          {
            productId: "a1",
            name: "Coqueta",
            imageUrl: null,
            units: 2,
            salesCents: 2400,
            costCents: null,
            profitCents: null,
          },
        ],
        channels: { whatsapp: 1, local: 0, web: 0 },
        topCustomers: [],
      };
    },
  };
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

test("Más → Reportes de la semana → sus alfajores, y atrás vuelve paso a paso", async () => {
  await renderRouter(
    { more: More, "reports/index": Reports, "reports/ranking": Ranking },
    { initialUrl: "/more", wrapper: Providers },
  );
  await fireEvent.press(await screen.findByRole("button", { name: /^Reportes, / }));
  expect(screen).toHavePathname("/reports");
  expect(await screen.findByText("Ganancia")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ver alfajores" }));
  expect(screen).toHavePathname("/reports/ranking");
  expect(await screen.findByText(/, pedidos entregados$/)).toBeOnTheScreen();
  expect(mockRanking).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), businessDate(new Date()));
  await act(() => router.back());
  expect(screen).toHavePathname("/reports");
  await act(() => router.back());
  expect(screen).toHavePathname("/more");
});

test("Más → Ayuda → «Exportar a Excel» abre su hoja", async () => {
  await renderRouter({ more: More }, { initialUrl: "/more", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Exportar a Excel" }));
  expect(await screen.findByRole("header", { name: "Exportar a Excel" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Este mes", checked: true })).toBeOnTheScreen();
});
