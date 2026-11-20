// Pedidos → tocar una fila → el pedido, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import OrderScreen from "@/app/(main)/orders/[id]";
import Orders from "@/app/(main)/(tabs)/orders";
import MainLayout from "@/app/(main)/_layout";
import { businessDate } from "@/lib/dates";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/orders/api/orders", () => {
  const { TEST_ORDER, summaryOf } = jest.requireActual("@/test/orders");
  const { businessDate: today } = jest.requireActual("@/lib/dates");
  return {
    listOrders: async () => ({
      items: [{ ...summaryOf(TEST_ORDER), dueDate: today(new Date()) }],
      meta: { limit: 20, total: 1, hasMore: false, nextCursor: null },
    }),
    getOrderCounts: async () => ({ today: 1, toDeliver: 1, upcoming: 0, toCollect: 1, all: 1 }),
    getOrder: async () => TEST_ORDER,
  };
});

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

test("tocar un pedido de la lista lo abre", async () => {
  expect(businessDate(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await renderRouter(
    { _layout: MainLayout, orders: Orders, "orders/[id]": OrderScreen },
    { initialUrl: "/orders", wrapper: Providers },
  );
  await fireEvent.press(await screen.findByRole("button", { name: /^#0042/ }));
  expect(screen).toHavePathname("/orders/00000000-0000-4000-8000-0000000000f1");
  expect(await screen.findByText("Pedido #0042")).toBeOnTheScreen();
});
