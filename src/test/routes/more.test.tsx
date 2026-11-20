// Más: «Tu negocio» y «Ajustes», cada fila a su pantalla, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import More from "@/app/(main)/(tabs)/more";
import Products from "@/app/(main)/more/products";
import Expenses from "@/app/(main)/expenses/index";
import Receivables from "@/app/(main)/orders/receivables";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/auth", () => ({ AccountSection: () => null }));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [], saveProduct: jest.fn() }));
jest.mock("@/features/expenses/api/expenses", () => ({
  listExpenseCategories: async () => [
    { id: "c1", name: "Insumos", icon: "basket-outline", isActive: true, sortOrder: 1, version: 1 },
  ],
  getExpensesSummary: async () => ({ totalCents: 13100, byCategory: [] }),
  listExpenses: async () => ({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } }),
}));
jest.mock("@/features/orders/api/orders", () => ({
  listReceivables: async () => ({
    items: [],
    meta: { limit: 20, total: 1, hasMore: false, nextCursor: null, totalDueCents: 2200 },
  }),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

const ROUTES = { more: More, "more/products": Products, "orders/receivables": Receivables, "expenses/index": Expenses };

test("Más ordena «Tu negocio» y «Ajustes»: Por cobrar con lo que te deben, y los tipos de gasto en su hoja", async () => {
  await renderRouter(ROUTES, { initialUrl: "/more", wrapper: Providers });
  expect(await screen.findByText("Tu negocio")).toBeOnTheScreen();
  expect(screen.getByText("Ajustes")).toBeOnTheScreen();
  expect(await screen.findByText("S/ 22.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: /^Por cobrar/ }));
  expect(screen).toHavePathname("/orders/receivables");
  await act(() => router.back());
  expect(screen).toHavePathname("/more");
  expect(await screen.findByText("1 tipo")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: /^Tipos de gasto/ }));
  expect(await screen.findByText("Los que eliges al anotar un gasto.")).toBeOnTheScreen();
});

test("Más → Gastos, con lo gastado en el mes, y atrás vuelve", async () => {
  await renderRouter(ROUTES, { initialUrl: "/more", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: /^Gastos, S\/.131\.00$/ }));
  expect(screen).toHavePathname("/expenses");
  expect(await screen.findByText("Todavía no hay gastos este mes")).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen).toHavePathname("/more");
});
