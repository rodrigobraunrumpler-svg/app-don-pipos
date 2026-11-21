// Pedidos › Clientes → la ficha → uno de sus pedidos → atrás, los atajos de arriba, «Escribirle» en «No vuelven» y un
// filtro que llega desde Inicio, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import CustomerProfile from "@/app/(main)/customers/[id]";
import OrderScreen from "@/app/(main)/orders/[id]";
import Orders from "@/app/(main)/(tabs)/orders";
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
jest.mock("@/features/orders/api/orders", () => {
  const { TEST_ORDER, summaryOf } = jest.requireActual("@/test/orders");
  return {
    listReceivables: async () => ({
      items: [],
      meta: { limit: 20, total: 0, hasMore: false, nextCursor: null, totalDueCents: 0 },
    }),
    listCustomerOrders: async () => ({
      items: [summaryOf(TEST_ORDER)],
      meta: { limit: 20, total: 1, hasMore: false, nextCursor: null },
    }),
    getOrder: async () => TEST_ORDER,
    listOrders: async () => ({
      items: [summaryOf(TEST_ORDER)],
      meta: { limit: 20, total: 1, hasMore: false, nextCursor: null },
    }),
    getOrderCounts: async () => ({ today: 1, toDeliver: 1, upcoming: 0, toCollect: 1, all: 1 }),
  };
});
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => jest.requireActual("@/test/business").TEST_BUSINESS,
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
jest.mock("@/features/messages/api/templates", () => ({
  listTemplates: async () => [
    {
      key: "we_miss_you",
      body: "Hola {nombre}, hace tiempo que no te vemos por Don Pipos.",
      version: 1,
      isDefault: true,
    },
  ],
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
  orders: Orders,
  "customers/[id]": CustomerProfile,
  "orders/[id]": OrderScreen,
};

async function openCustomers() {
  await renderRouter(ROUTES, { initialUrl: "/orders", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("radio", { name: "Clientes" }));
}

test("Pedidos › Clientes → la ficha → uno de sus pedidos, y atrás vuelve paso a paso hasta los clientes", async () => {
  await openCustomers();
  await fireEvent.press(await screen.findByRole("button", { name: /^Rosa T\. \(DEMO\)/ }));
  expect(screen).toHavePathname("/customers/c2");
  expect(await screen.findByText("900 000 505")).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole("button", { name: /^#0042/ }));
  expect(screen).toHavePathname("/orders/00000000-0000-4000-8000-0000000000f1");
  expect(await screen.findByText("Pedido #0042")).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen).toHavePathname("/customers/c2");
  await act(() => router.back());
  expect(screen).toHavePathname("/orders");
  expect(screen.getByRole("radio", { name: "Clientes", checked: true })).toBeOnTheScreen();
});

test("arriba de los clientes: la fidelidad y desde cuándo un cliente no vuelve", async () => {
  await openCustomers();
  expect(await screen.findByRole("button", { name: "Fidelidad, Apagada" })).toBeOnTheScreen();
  expect(await screen.findByRole("button", { name: "Clientes que no vuelven, 30 días" })).toBeOnTheScreen();
});

test("un filtro que llega desde Inicio muestra los pedidos, aunque se estuvieran mirando los clientes", async () => {
  await openCustomers();
  await act(() => router.navigate({ pathname: "/orders", params: { filter: "to_deliver" } }));
  expect(await screen.findByRole("radio", { name: "Pedidos", checked: true })).toBeOnTheScreen();
  expect(await screen.findByRole("button", { name: "Por entregar", selected: true })).toBeOnTheScreen();
});

test("en «No vuelven», «Escribirle» abre WhatsApp con el mensaje lleno", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await openCustomers();
  await fireEvent.press(await screen.findByRole("button", { name: "No vuelven" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Escribirle" }));
  expect(open).toHaveBeenCalledWith(
    `https://wa.me/51900000505?text=${encodeURIComponent("Hola Rosa, hace tiempo que no te vemos por Don Pipos.")}`,
  );
  open.mockRestore();
});
