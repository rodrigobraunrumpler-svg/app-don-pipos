// Nuevo pedido, paso 1, y el botón +, con las rutas de verdad
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import MainLayout from "@/app/(main)/_layout";
import Home from "@/app/(main)/home";
import New from "@/app/(main)/new";
import OrdersLayout from "@/app/(main)/orders/_layout";
import Counter from "@/app/(main)/orders/counter";
import Orders from "@/app/(main)/orders/index";
import NewOrder from "@/app/(main)/orders/new";
import StockLayout from "@/app/(main)/stock/_layout";
import Stock from "@/app/(main)/stock/index";
import Production from "@/app/(main)/stock/production";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => (jest.requireActual("@/test/products") as { TEST_PRODUCTS: unknown }).TEST_PRODUCTS,
  saveProduct: jest.fn(),
}));
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
}));
jest.mock("@/features/orders/api/orders", () => ({
  listOrders: async () => ({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } }),
  getOrderCounts: async () => ({ today: 0, toDeliver: 0, upcoming: 0, toCollect: 0, all: 0 }),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => AsyncStorage.clear());

const openNewOrder = () => renderRouter({ "orders/new": NewOrder }, { initialUrl: "/orders/new", wrapper: Providers });

test("el pedido a medio anotar vuelve después de cerrar la pantalla, y se puede empezar de nuevo", async () => {
  const first = await openNewOrder();
  expect(await screen.findByText("Paso 1 de 2: qué lleva")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Seguir" })).toBeDisabled();
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  expect(screen.getByText("1 alfajor")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Más Coqueta" }));
  expect(screen.getByText("2 alfajores")).toBeOnTheScreen();
  expect(screen.getByText("S/ 24.00")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Seguir" })).toBeEnabled();
  await first.unmount();

  await openNewOrder();
  expect(await screen.findByText(/^Recuperamos el pedido que dejaste a medias a las \d\d:\d\d\.$/)).toBeOnTheScreen();
  expect(await screen.findByDisplayValue("2")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Empezar de nuevo" }));
  expect(screen.queryByText(/^Recuperamos/)).toBeNull();
  expect(screen.getByText("Elige al menos un alfajor")).toBeOnTheScreen();
});

test("pedir más de lo que queda avisa, pero deja seguir", async () => {
  await openNewOrder();
  expect(await screen.findByText("Quedan 13")).toBeOnTheScreen();
  await fireEvent.changeText(await screen.findByLabelText("Cantidad de Coqueta"), "14");
  expect(screen.getByText("Solo quedan 13. Puedes anotarlo igual y ajustar el stock después.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Seguir" })).toBeEnabled();
});

test("el botón + abre «¿Qué quieres anotar?» y cada opción lleva a su pantalla", async () => {
  await renderRouter(
    {
      _layout: MainLayout,
      home: Home,
      new: New,
      "orders/_layout": OrdersLayout,
      "orders/index": Orders,
      "orders/new": NewOrder,
      "orders/counter": Counter,
      "stock/_layout": StockLayout,
      "stock/index": Stock,
      "stock/production": Production,
    },
    { initialUrl: "/home", wrapper: Providers },
  );
  const choose = async (option: string) => {
    await fireEvent.press(await screen.findByRole("button", { name: "Anotar" }));
    expect(await screen.findByText("¿Qué quieres anotar?")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: new RegExp(`^${option}`) }));
  };
  await choose("Un pedido");
  expect(screen).toHavePathname("/orders/new");
  await choose("Una venta de mostrador");
  expect(screen).toHavePathname("/orders/counter");
  await choose("La producción");
  expect(screen).toHavePathname("/stock/production");
});
