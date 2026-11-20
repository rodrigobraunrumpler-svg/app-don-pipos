// Más → Clientes → la ficha → atrás, y «Escribirle» en «No vuelven», con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import More from "@/app/(main)/(tabs)/more";
import CustomerProfile from "@/app/(main)/customers/[id]";
import Customers from "@/app/(main)/customers/index";
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
const ROUTES = { more: More, "customers/index": Customers, "customers/[id]": CustomerProfile };

test("Más → Clientes → la ficha, y atrás vuelve paso a paso", async () => {
  await renderRouter(ROUTES, { initialUrl: "/more", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Clientes, 1" }));
  expect(screen).toHavePathname("/customers");
  await fireEvent.press(await screen.findByRole("button", { name: /^Rosa T\. \(DEMO\)/ }));
  expect(screen).toHavePathname("/customers/c2");
  expect(await screen.findByText("900 000 505")).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen).toHavePathname("/customers");
  await act(() => router.back());
  expect(screen).toHavePathname("/more");
});

test("en «No vuelven», «Escribirle» abre WhatsApp con el mensaje lleno", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await renderRouter(ROUTES, { initialUrl: "/customers", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "No vuelven" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Escribirle" }));
  expect(open).toHaveBeenCalledWith(
    `https://wa.me/51900000505?text=${encodeURIComponent("Hola Rosa, hace tiempo que no te vemos por Don Pipos.")}`,
  );
  open.mockRestore();
});
