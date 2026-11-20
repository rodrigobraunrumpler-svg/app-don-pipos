// La campana de Inicio: «Avisos» con un punto si hay alguno; tocar uno abre su pantalla y atrás vuelve a Inicio
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import MainLayout from "@/app/(main)/_layout";
import Home from "@/app/(main)/(tabs)/home";
import Production from "@/app/(main)/stock/production";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

let mockState = "low";
const emptyPage = { items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null, totalDueCents: 0 } };
jest.mock("@/features/orders/api/orders", () => ({
  listOrders: async () => emptyPage,
  listUpcomingOrders: async () => [],
  listReceivables: async () => emptyPage,
  getOrderCounts: async () => ({ today: 0, toDeliver: 0, upcoming: 0, toCollect: 0, all: 0 }),
}));
jest.mock("@/features/reports/api/reports", () => ({
  getHomeSummary: async () => ({
    collectedTodayCents: 0,
    collectedByMethod: { cash: 0, yape: 0, plin: 0, transfer: 0 },
    deliveredToday: 0,
    toDeliver: 0,
    receivablesCents: 0,
    cashClosedToday: false,
  }),
}));
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => [
    {
      productId: "p1",
      name: "Morenita",
      imageUrl: null,
      linkedToWeb: false,
      minStock: 6,
      onHand: 4,
      reserved: 0,
      physical: 4,
      coverageDays: 1,
      state: mockState,
    },
  ],
  getProductionSuggestion: async () => ({ ready: false, horizonDays: 7, items: [] }),
}));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [] }));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => jest.requireActual("@/test/business").TEST_BUSINESS,
}));
jest.mock("@/features/messages/api/templates", () => ({ listTemplates: async () => [] }));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
const ROUTES = { _layout: MainLayout, home: Home, "stock/production": Production };

test("con un alfajor que se acaba, la campana lo lista y tocarlo abre Registrar producción", async () => {
  mockState = "low";
  await renderRouter(ROUTES, { initialUrl: "/home", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Avisos, 1" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Morenita se está acabando/ }));
  expect(screen).toHavePathname("/stock/production");
  await act(() => router.back());
  expect(screen).toHavePathname("/home");
});

test("sin avisos, la campana no lleva punto y lo dice", async () => {
  mockState = "ok";
  await renderRouter(ROUTES, { initialUrl: "/home", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Avisos" }));
  expect(await screen.findByText("No hay avisos por ahora.")).toBeOnTheScreen();
});
