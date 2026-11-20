// Más → cada hoja de Ajustes (medios de pago, delivery, producción, clientes que no vuelven) → cerrar, y Más sigue ahí
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import More from "@/app/(main)/(tabs)/more";
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
}));
jest.mock("@/features/messages/api/templates", () => ({ listTemplates: async () => [] }));
jest.mock("@/features/customers/api/customers", () => ({
  searchCustomers: async () => ({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } }),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

test.each([
  ["Medios de pago, 4", "Los que apagues dejan de aparecer al anotar pedidos y gastos."],
  ["Delivery, S/ 5.00", "Lo que cobras por llevar un pedido. Se suma solo al elegir delivery."],
  ["Producción, Cada 7 días", "La sugerencia cubre los días hasta tu siguiente tanda."],
  ["Clientes que no vuelven, 30 días", "Si un cliente no pide en 30 días, sale en «No vuelven»."],
])("Más → «%s» abre su hoja, y cerrarla deja Más", async (row, text) => {
  await renderRouter({ more: More }, { initialUrl: "/more", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: row }));
  expect(await screen.findByText(text)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.queryByText(text)).not.toBeOnTheScreen();
  expect(screen).toHavePathname("/more");
});
