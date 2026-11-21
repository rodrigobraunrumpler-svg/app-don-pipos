// Ajustes (se abre con el ⚙ de Inicio): cada hoja se abre y se cierra ahí mismo, y cada pantalla se abre encima y
// «Volver» regresa a Ajustes
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import Settings from "@/app/(main)/settings/index";
import Loyalty from "@/app/(main)/settings/loyalty";
import Messages from "@/app/(main)/settings/messages";
import Products from "@/app/(main)/settings/products";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

// La cuenta necesita la sesión del celular; aquí basta con lo que se le pasa (Recordatorios)
jest.mock("@/features/auth", () => ({ AccountSection: ({ extra }: { extra?: ReactNode }) => extra ?? null }));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [] }));
jest.mock("@/features/expenses/api/expenses", () => ({ listExpenseCategories: async () => [] }));
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

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
const ROUTES = {
  "settings/index": Settings,
  "settings/products": Products,
  "settings/messages": Messages,
  "settings/loyalty": Loyalty,
};

test("Ajustes ordena lo del negocio, lo de los clientes y lo de este celular", async () => {
  await renderRouter(ROUTES, { initialUrl: "/settings", wrapper: Providers });
  expect(await screen.findByRole("header", { name: "Ajustes" })).toBeOnTheScreen();
  for (const title of ["Tu negocio", "Tus clientes"])
    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
  expect(await screen.findByRole("button", { name: "Recordatorios, 3 activos" })).toBeOnTheScreen();
});

test.each([
  ["Medios de pago, 4", "Los que apagues dejan de aparecer al anotar pedidos y gastos."],
  ["Delivery, S/ 5.00", "Lo que cobras por llevar un pedido. Se suma solo al elegir delivery."],
  ["Producción, Cada 7 días", "La sugerencia cubre los días hasta tu siguiente tanda."],
  ["Clientes que no vuelven, 30 días", "Si un cliente no pide en 30 días, sale en «No vuelven»."],
  ["Recordatorios, 3 activos", "Avisos del propio celular, aunque la app esté cerrada."],
  ["Tipos de gasto, 0 tipos", "Los que eliges al anotar un gasto."],
])("Ajustes → «%s» abre su hoja, y cerrarla deja Ajustes", async (row, text) => {
  await renderRouter(ROUTES, { initialUrl: "/settings", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: row }));
  expect(await screen.findByText(text)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.queryByText(text)).not.toBeOnTheScreen();
  expect(screen).toHavePathname("/settings");
});

test.each([
  [/^Productos y precios/, "/settings/products"],
  ["Mensajes de WhatsApp, 1", "/settings/messages"],
  ["Fidelidad, Apagada", "/settings/loyalty"],
])("Ajustes → «%s» se abre encima, y «Volver» regresa a Ajustes", async (row, path) => {
  await renderRouter(ROUTES, { initialUrl: "/settings", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: row }));
  expect(screen).toHavePathname(path);
  await act(() => router.back());
  expect(screen).toHavePathname("/settings");
});
