// Pedidos → Por cobrar → un pedido, y atrás paso a paso, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import TabsLayout from "@/app/(main)/(tabs)/_layout";
import Home from "@/app/(main)/(tabs)/home";
import Orders from "@/app/(main)/(tabs)/orders";
import MainLayout from "@/app/(main)/_layout";
import OrderScreen from "@/app/(main)/orders/[id]";
import ReceivablesScreen from "@/app/(main)/orders/receivables";
import { TEST_ORDER } from "@/test/orders";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

const mockReceivable = {
  id: TEST_ORDER.id,
  number: 42,
  customerName: "Ana (DEMO)",
  customerPhone: "+51900000990",
  fulfillment: "delivery",
  status: "new",
  totalCents: 4200,
  paidCents: 2000,
  dueDate: "2026-11-19",
  scheduledFor: null,
  remind: true,
};
jest.mock("@/features/orders/api/orders", () => ({
  listOrders: async () => ({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } }),
  getOrderCounts: async () => ({ today: 0, toDeliver: 0, upcoming: 0, toCollect: 1, all: 1 }),
  listReceivables: async () => ({
    items: [mockReceivable],
    meta: { limit: 20, total: 1, hasMore: false, nextCursor: null, totalDueCents: 2200 },
  }),
  getOrder: async () => (jest.requireActual("@/test/orders") as { TEST_ORDER: unknown }).TEST_ORDER,
}));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [] }));
jest.mock("@/features/stock/api/stock", () => ({ getStockOverview: async () => [] }));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 500, version: 1 },
  }),
}));
jest.mock("@/features/messages/api/templates", () => ({ listTemplates: async () => [] }));

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
  "orders/receivables": ReceivablesScreen,
  "orders/[id]": OrderScreen,
};

test("Pedidos → «Por cobrar» → Ver por cobrar → un pedido, y la flecha vuelve paso a paso", async () => {
  await renderRouter(ROUTES, { initialUrl: "/orders", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: /^Por cobrar/ }));
  expect(await screen.findByText("Te deben S/ 22.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ver por cobrar" }));
  expect(await screen.findByText("Lo que te deben, de todos los pedidos")).toBeOnTheScreen();
  expect(screen).toHavePathname("/orders/receivables");
  await fireEvent.press(await screen.findByRole("button", { name: /^#0042/ }));
  expect(await screen.findByText("Pedido #0042")).toBeOnTheScreen();
  expect(screen).toHavePathname(`/orders/${TEST_ORDER.id}`);
  await act(() => router.back());
  expect(screen).toHavePathname("/orders/receivables");
  await act(() => router.back());
  expect(screen).toHavePathname("/orders");
  // La pestaña sigue en «Por cobrar», como la dejó
  expect(await screen.findByText("Te deben S/ 22.00")).toBeOnTheScreen();
});
