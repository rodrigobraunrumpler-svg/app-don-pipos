// Las pantallas que se abren encima de las pestañas no tienen la barra de pestañas debajo: dejan el espacio de la
// barra del sistema, o sus botones de abajo quedan tapados («Contar stock» y «Anotar merma» en Un alfajor)
import { QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType, ReactNode } from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Orders from "@/app/(main)/(tabs)/orders";
import ChangePin from "@/app/(main)/settings/change-pin";
import Products from "@/app/(main)/settings/products";
import OrderScreen from "@/app/(main)/orders/[id]";
import Counter from "@/app/(main)/orders/counter";
import NewOrderLayout from "@/app/(main)/orders/new/_layout";
import NewOrder from "@/app/(main)/orders/new/index";
import ProductStockScreen from "@/app/(main)/stock/[productId]";
import Production from "@/app/(main)/stock/production";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

// Aquí solo importa el fondo de la pantalla: el contenido de Cambiar PIN pide la sesión, que esta prueba no necesita
jest.mock("@/features/auth/components/change-pin-flow", () => ({ ChangePinFlow: () => null }));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

// Un celular con muesca arriba y la barra de navegación del sistema abajo
beforeEach(() => jest.mocked(useSafeAreaInsets).mockReturnValue({ top: 24, bottom: 48, left: 0, right: 0 }));
afterEach(() => jest.mocked(useSafeAreaInsets).mockReset());

const padding = () => StyleSheet.flatten(screen.getByTestId("screen").props.style);

test.each<[string, Record<string, ComponentType>]>([
  // Nuevo pedido, con su recorrido (el borrador vive en su _layout)
  ["/orders/new", { "orders/new/_layout": NewOrderLayout, "orders/new/index": NewOrder }],
  ["/orders/counter", { "orders/counter": Counter }],
  ["/orders/00000000-0000-4000-8000-0000000000f1", { "orders/[id]": OrderScreen }],
  ["/stock/production", { "stock/production": Production }],
  ["/stock/00000000-0000-4000-8000-000000000a01", { "stock/[productId]": ProductStockScreen }],
  ["/settings/products", { "settings/products": Products }],
  ["/settings/change-pin", { "settings/change-pin": ChangePin }],
])("%s deja abajo el espacio de la barra del sistema", async (url, routes) => {
  await renderRouter(routes, { initialUrl: url, wrapper: Providers });
  expect(padding()).toMatchObject({ paddingTop: 24, paddingBottom: 48 });
});

test("una pestaña no lo deja: su barra de pestañas ya está abajo", async () => {
  await renderRouter({ orders: Orders }, { initialUrl: "/orders", wrapper: Providers });
  expect(padding()).toMatchObject({ paddingTop: 24, paddingBottom: 0 });
});
