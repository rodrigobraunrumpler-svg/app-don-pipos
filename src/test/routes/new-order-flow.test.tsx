// Moverse por Nuevo pedido con las rutas de verdad: atrás paso a paso, el recorrido que se cierra al guardar, sin
// pantallas repetidas y sin salir a media guarda
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import TabsLayout from "@/app/(main)/(tabs)/_layout";
import Home from "@/app/(main)/(tabs)/home";
import New from "@/app/(main)/(tabs)/new";
import Orders from "@/app/(main)/(tabs)/orders";
import Stock from "@/app/(main)/(tabs)/stock";
import MainLayout from "@/app/(main)/_layout";
import Counter from "@/app/(main)/orders/counter";
import NewOrderLayout from "@/app/(main)/orders/new/_layout";
import NewOrderDetails from "@/app/(main)/orders/new/details";
import NewOrder from "@/app/(main)/orders/new/index";
import SavedOrderScreen from "@/app/(main)/orders/saved/[id]";
import Production from "@/app/(main)/stock/production";
import { TEST_ORDER } from "@/test/orders";
import { createTestQueryClient } from "@/test/render";
import { ThemeProvider } from "@/theme";

const mockCreate = jest.fn();
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
  createOrder: (input: unknown) => mockCreate(input),
}));
jest.mock("@/features/customers/api/customers", () => ({ findCustomerByPhone: async () => null }));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 500, version: 1 },
  }),
}));
jest.mock("@/features/messages/api/templates", () => ({
  listTemplates: async () => [
    { key: "confirmation", body: "Hola {nombre}, recibimos tu pedido {numero}. ¡Gracias!", version: 1 },
  ],
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockCreate.mockReset();
  mockCreate.mockResolvedValue(TEST_ORDER);
});

// Nuevo pedido son tres pantallas: el paso 1, el 2 (en la misma pila, con el borrador compartido) y el guardado
const NEW_ORDER = {
  "orders/new/_layout": NewOrderLayout,
  "orders/new/index": NewOrder,
  "orders/new/details": NewOrderDetails,
  "orders/saved/[id]": SavedOrderScreen,
};
const openNewOrder = () => renderRouter(NEW_ORDER, { initialUrl: "/orders/new", wrapper: Providers });

// Como en la app: las pestañas y, encima, las pantallas que se abren desde ellas
const ROUTES = {
  _layout: MainLayout,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/home": Home,
  "(tabs)/new": New,
  "(tabs)/orders": Orders,
  "(tabs)/stock": Stock,
  ...NEW_ORDER,
  "orders/counter": Counter,
  "stock/production": Production,
};

// La pestaña elegida debajo de lo que se ve
type NavState = { type?: string; index?: number; routes?: { name: string; state?: NavState }[] };
function selectedTab(state: NavState | undefined): string | undefined {
  if (!state) return undefined;
  if (state.type === "tab") return state.routes?.[state.index ?? 0]?.name;
  for (const route of state.routes ?? []) {
    const found = selectedTab(route.state);
    if (found) return found;
  }
  return undefined;
}

test("Nuevo pedido abierto con el + se abre encima de Inicio: «Volver» regresa a Inicio y Pedidos sigue con su lista", async () => {
  const view = await renderRouter(ROUTES, { initialUrl: "/home", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Un pedido/ }));
  expect(await screen.findByText("Paso 1 de 2: qué lleva")).toBeOnTheScreen();
  // Sin cambiar de pestaña: al volver, la pantalla sale con su animación y deja ver Inicio
  expect(selectedTab(view.getRouterState() as NavState)).toBe("home");
  await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
  expect(screen).toHavePathname("/home");
  await fireEvent.press(screen.getByRole("button", { name: /Pedidos/ }));
  expect(screen).toHavePathname("/orders");
});

test("La producción abierta con el + vuelve a Inicio, y Stock sigue con su lista", async () => {
  const view = await renderRouter(ROUTES, { initialUrl: "/home", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^La producción/ }));
  expect(await screen.findByText("Registrar producción")).toBeOnTheScreen();
  expect(selectedTab(view.getRouterState() as NavState)).toBe("home");
  await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
  expect(screen).toHavePathname("/home");
  await fireEvent.press(screen.getByRole("button", { name: /Stock/ }));
  expect(screen).toHavePathname("/stock");
});

// Las rutas de una pila, por su nombre, buscando la que tiene esa pantalla
function stackWith(state: NavState | undefined, name: string): string[] | undefined {
  if (!state) return undefined;
  if (state.routes?.some((route) => route.name === name)) return state.routes.map((route) => route.name);
  for (const route of state.routes ?? []) {
    const found = stackWith(route.state, name);
    if (found) return found;
  }
  return undefined;
}

test("los pasos de Nuevo pedido son pantallas: atrás vuelve un paso; al guardar, el recorrido se cierra", async () => {
  const view = await renderRouter(ROUTES, { initialUrl: "/home", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Un pedido/ }));
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Seguir" }));
  expect(await screen.findByText("Paso 2 de 2")).toBeOnTheScreen();
  expect(screen).toHavePathname("/orders/new/details");
  // La flecha del celular (router.back, como el botón de Android) vuelve al paso 1, con lo que se eligió
  await act(() => router.back());
  expect(screen).toHavePathname("/orders/new");
  expect(await screen.findByText("1 alfajor")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Seguir" }));
  await fireEvent.changeText(await screen.findByLabelText("Teléfono del cliente"), "900000990");
  await fireEvent.changeText(await screen.findByLabelText("Nombre del cliente"), "Ana (DEMO)");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pedido de S/ 12.00" }));
  expect(await screen.findByText("Pedido #0042 guardado")).toBeOnTheScreen();
  // Guardado reemplaza el recorrido: en la pila ya no están los pasos
  expect(stackWith(view.getRouterState() as NavState, "(tabs)")).toEqual(["(tabs)", "orders/saved/[id]"]);
  await fireEvent.press(screen.getByRole("button", { name: "Anotar otro pedido" }));
  expect(await screen.findByText("Elige al menos un alfajor")).toBeOnTheScreen();
  expect(screen).toHavePathname("/orders/new");
  await act(() => router.back());
  expect(screen).toHavePathname("/home");
});

test("después de guardar, la flecha del celular lleva a donde se empezó", async () => {
  await renderRouter(ROUTES, { initialUrl: "/home", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Un pedido/ }));
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Seguir" }));
  await fireEvent.changeText(await screen.findByLabelText("Teléfono del cliente"), "900000990");
  await fireEvent.changeText(await screen.findByLabelText("Nombre del cliente"), "Ana (DEMO)");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pedido de S/ 12.00" }));
  expect(await screen.findByText("Pedido #0042 guardado")).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen).toHavePathname("/home");
});

test("dos toques seguidos en «Seguir» abren un solo paso 2", async () => {
  const view = await openNewOrder();
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  const next = screen.getByRole("button", { name: "Seguir" });
  await fireEvent.press(next);
  await fireEvent.press(next);
  expect(await screen.findByText("Paso 2 de 2")).toBeOnTheScreen();
  expect(stackWith(view.getRouterState() as NavState, "details")).toEqual(["index", "details"]);
});

test("mientras dice «Guardando…», atrás espera; al guardar, el pedido guardado reemplaza el recorrido", async () => {
  let resolve: (order: unknown) => void = () => undefined;
  mockCreate.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
  const view = await renderRouter(ROUTES, { initialUrl: "/home", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar" }));
  await fireEvent.press(await screen.findByRole("button", { name: /^Un pedido/ }));
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Seguir" }));
  await fireEvent.changeText(await screen.findByLabelText("Teléfono del cliente"), "900000990");
  await fireEvent.changeText(await screen.findByLabelText("Nombre del cliente"), "Ana (DEMO)");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pedido de S/ 12.00" }));
  // Con la señal lenta, el dueño toca atrás dos veces: no se va a ningún lado mientras se guarda
  await act(() => router.back());
  await act(() => router.back());
  expect(screen).toHavePathname("/orders/new/details");
  await act(async () => resolve(TEST_ORDER));
  expect(await screen.findByText("Pedido #0042 guardado")).toBeOnTheScreen();
  expect(stackWith(view.getRouterState() as NavState, "(tabs)")).toEqual(["(tabs)", "orders/saved/[id]"]);
  await act(() => router.back());
  expect(screen).toHavePathname("/home");
});
