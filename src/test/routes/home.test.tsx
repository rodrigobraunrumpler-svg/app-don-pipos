// Inicio → «por entregar» → Pedidos con el filtro puesto, e Inicio → ⚙ → Ajustes → atrás, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import MainLayout from "@/app/(main)/_layout";
import Home from "@/app/(main)/(tabs)/home";
import Orders from "@/app/(main)/(tabs)/orders";
import Settings from "@/app/(main)/settings/index";
import { formatLongDate } from "@/lib/dates";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/orders/api/orders", () => {
  const { TEST_ORDER, summaryOf } = jest.requireActual("@/test/orders");
  const { businessDate } = jest.requireActual("@/lib/dates");
  return {
    listOrders: async (input: { filter: string }) => {
      const items =
        input.filter === "upcoming" ? [] : [{ ...summaryOf(TEST_ORDER), dueDate: businessDate(new Date()) }];
      return { items, meta: { limit: 20, total: items.length, hasMore: false, nextCursor: null } };
    },
    getOrderCounts: async () => ({ today: 1, toDeliver: 1, upcoming: 0, toCollect: 1, all: 1 }),
  };
});
jest.mock("@/features/reports/api/reports", () => ({
  getHomeSummary: async () => ({
    collectedTodayCents: 2000,
    collectedByMethod: { cash: 2000, yape: 0, plin: 0, transfer: 0 },
    deliveredToday: 0,
    toDeliver: 1,
    receivablesCents: 2200,
    cashClosedToday: false,
  }),
}));
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => jest.requireActual("@/test/stock-items").TEST_ITEMS,
  getProductionSuggestion: async () => ({ ready: false, horizonDays: 7, items: [] }),
}));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 500, version: 1 },
  }),
}));
jest.mock("@/features/messages/api/templates", () => ({ listTemplates: async () => [] }));
// Ajustes: la cuenta necesita la sesión del celular; aquí no hace falta
jest.mock("@/features/auth", () => ({ AccountSection: () => null }));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [] }));
jest.mock("@/features/expenses/api/expenses", () => ({ listExpenseCategories: async () => [] }));
jest.mock("@/features/loyalty/api/loyalty", () => ({
  getLoyaltySettings: async () => ({
    isActive: false,
    stampUnit: "order",
    goal: 10,
    rewardKind: "free_item",
    rewardAmountCents: null,
    rewardText: null,
    version: 1,
  }),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

test("Inicio muestra la fecha de hoy, y tocar «por entregar» abre Pedidos con ese filtro", async () => {
  await renderRouter({ _layout: MainLayout, home: Home, orders: Orders }, { initialUrl: "/home", wrapper: Providers });
  expect(await screen.findByText(formatLongDate(new Date()))).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole("button", { name: "1 por entregar" }));
  expect(screen).toHavePathname("/orders");
  expect(await screen.findByRole("button", { name: "Por entregar", selected: true })).toBeOnTheScreen();
});

test("el ⚙ de Inicio abre Ajustes, y «Volver» regresa a Inicio", async () => {
  await renderRouter(
    { _layout: MainLayout, home: Home, "settings/index": Settings },
    { initialUrl: "/home", wrapper: Providers },
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Ajustes" }));
  expect(screen).toHavePathname("/settings");
  expect(await screen.findByRole("header", { name: "Tu negocio" })).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen).toHavePathname("/home");
});
