// La barra de abajo y el cambio Pedidos | Clientes con las pestañas y la pila de verdad (fase 7c): qué pestañas hay, el +
// con «Un ingreso», un filtro que llega desde Inicio y volver de Clientes sin perder el filtro ni la búsqueda
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import TabsLayout from "@/app/(main)/(tabs)/_layout";
import Home from "@/app/(main)/(tabs)/home";
import New from "@/app/(main)/(tabs)/new";
import Orders from "@/app/(main)/(tabs)/orders";
import Reports from "@/app/(main)/(tabs)/reports";
import Stock from "@/app/(main)/(tabs)/stock";
import MainLayout from "@/app/(main)/_layout";
import IncomeNew from "@/app/(main)/income/new";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/auth", () => ({ AccountSection: () => null }));
jest.mock("@/features/orders/api/orders", () => {
  const { TEST_ORDER, summaryOf } = jest.requireActual("@/test/orders");
  return {
    listOrders: async () => ({
      items: [summaryOf(TEST_ORDER)],
      meta: { limit: 20, total: 1, hasMore: false, nextCursor: null },
    }),
    getOrderCounts: async () => ({ today: 1, toDeliver: 1, upcoming: 0, toCollect: 1, all: 1 }),
    listReceivables: async () => ({
      items: [],
      meta: { limit: 20, total: 0, hasMore: false, nextCursor: null, totalDueCents: 0 },
    }),
    listCustomerOrders: async () => ({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } }),
    getOrder: async () => TEST_ORDER,
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
  getReportSummary: async () => ({
    incomeCents: 2400,
    expensesCents: 100,
    profitCents: 2300,
    previous: { incomeCents: 0, expensesCents: 0, profitCents: 0 },
    bars: [],
    byMethod: { cash: 0, yape: 2400, plin: 0, transfer: 0 },
  }),
}));
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => [],
  getProductionSuggestion: async () => ({ ready: false, horizonDays: 7, items: [] }),
}));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => jest.requireActual("@/test/business").TEST_BUSINESS,
}));
jest.mock("@/features/messages/api/templates", () => ({ listTemplates: async () => [] }));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [] }));
jest.mock("@/features/expenses/api/expenses", () => ({
  listExpenseCategories: async () => [],
  getExpensesSummary: async () => ({ totalCents: 0, byCategory: [] }),
  listExpenses: async () => ({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } }),
}));
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
  getLoyaltyOverview: async () => ({ goal: 10, customers: [] }),
}));
const ROSA = {
  id: "c2",
  name: "Rosa T. (DEMO)",
  phone: "+51900000505",
  ordersCount: 3,
  spentCents: 7200,
  lastOrderAt: "2026-10-01T15:00:00.000Z",
  acceptsPromotions: true,
};
jest.mock("@/features/customers/api/customers", () => ({
  searchCustomers: async () => ({ items: [ROSA], meta: { limit: 20, total: 1, hasMore: false, nextCursor: null } }),
  getCustomer: async () => ({
    ...ROSA,
    address: null,
    note: null,
    stamps: 0,
    favorite: null,
    anonymizedAt: null,
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
const ROUTES = {
  _layout: MainLayout,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/home": Home,
  "(tabs)/orders": Orders,
  "(tabs)/new": New,
  "(tabs)/stock": Stock,
  "(tabs)/reports": Reports,
  "income/new": IncomeNew,
};
const open = (initialUrl: string) => renderRouter(ROUTES, { initialUrl, wrapper: Providers });

test("la barra de abajo: Inicio, Pedidos, Anotar, Stock y Reportes; Más ya no está", async () => {
  await open("/home");
  for (const tab of ["Inicio", "Pedidos", "Anotar", "Stock", "Reportes"])
    expect(await screen.findByRole("button", { name: new RegExp(`^${tab}`) })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: /^Más/ })).toBeNull();
});

test("el + → «Un ingreso» abre la pantalla para anotarlo, y «Volver» regresa", async () => {
  await open("/home");
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Un ingreso/ }));
  expect(screen).toHavePathname("/income/new");
  expect(await screen.findByText("Anotar ingreso")).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen).toHavePathname("/home");
});

test("mirando Clientes, «1 por entregar» en Inicio abre Pedidos con ese filtro", async () => {
  await open("/orders");
  await fireEvent.press(await screen.findByRole("radio", { name: "Clientes" }));
  await act(() => router.navigate("/home"));
  await fireEvent.press(await screen.findByRole("button", { name: "1 por entregar" }));
  expect(screen).toHavePathname("/orders");
  expect(await screen.findByRole("radio", { name: "Pedidos", checked: true })).toBeOnTheScreen();
  expect(await screen.findByRole("button", { name: "Por entregar", selected: true })).toBeOnTheScreen();
});

test("pasar a Clientes y volver a Pedidos deja el filtro y la búsqueda como estaban", async () => {
  await open("/orders");
  await fireEvent.press(await screen.findByRole("button", { name: "Por entregar" }));
  await fireEvent.changeText(screen.getByLabelText("Buscar pedidos"), "patricia");
  await fireEvent.press(screen.getByRole("radio", { name: "Clientes" }));
  expect(await screen.findByRole("button", { name: /^Rosa T\. \(DEMO\)/ })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("radio", { name: "Pedidos" }));
  expect(await screen.findByRole("button", { name: "Por entregar", selected: true })).toBeOnTheScreen();
  expect(screen.getByLabelText("Buscar pedidos")).toHaveDisplayValue("patricia");
});
