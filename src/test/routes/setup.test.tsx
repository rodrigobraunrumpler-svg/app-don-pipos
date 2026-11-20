// La puesta en marcha de la primera vez: la puerta del layout raíz (con la app de verdad) y los tres pasos, con «atrás»
// sin perder lo puesto, «Terminar» una sola vez y «Todo listo»
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import SetupLayout from "@/app/setup/_layout";
import SetupDoneRoute from "@/app/setup/done";
import SetupExpenses from "@/app/setup/expenses";
import SetupProducts from "@/app/setup/index";
import SetupStock from "@/app/setup/stock";
import { businessesKeys, type Business } from "@/features/businesses";
import { AppError } from "@/lib/errors";
import { hashPin } from "@/lib/local-pin";
import { TEST_BUSINESS } from "@/test/business";
import { TEST_PRODUCTS } from "@/test/products";
import { createTestQueryClient } from "@/test/render";
import { COQUETA_ID, LIMON_ID } from "@/test/stock-items";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/auth/api/session", () => ({
  getSessionState: async () => "signed-in",
  onSessionChange: () => () => undefined,
  signOutHere: jest.fn(),
}));
jest.mock("@/features/auth/api/pin", () => ({ signInWithPin: jest.fn(), changePin: jest.fn() }));
jest.mock("@/lib/env", () => ({
  appEnv: {
    ok: true,
    env: { supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co", supabaseKey: "sb_publishable_x" },
  },
}));
jest.mock("expo-network", () => ({
  addNetworkStateListener: () => ({ remove: jest.fn() }),
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
}));
const mockGetBusiness = jest.fn();
const mockComplete = jest.fn();
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: () => mockGetBusiness(),
  completeSetup: (input: unknown) => mockComplete(input),
}));
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => jest.requireActual("@/test/products").TEST_PRODUCTS,
}));

beforeEach(() => {
  mockGetBusiness.mockReset();
  mockComplete.mockReset();
});

async function type(digits: string) {
  for (const digit of digits) await fireEvent.press(screen.getByRole("button", { name: digit }));
}

async function openApp() {
  await SecureStore.setItemAsync("auth.local-pin", JSON.stringify(await hashPin("197346")));
  await SecureStore.setItemAsync("auth.phone", "+51900000901");
  await renderRouter("src/app", { initialUrl: "/" });
  expect(await screen.findByText("Escribe tu PIN")).toBeOnTheScreen();
  await type("197346");
}

test("ingresar → la puesta en marcha → Inicio, con la app de verdad", async () => {
  mockGetBusiness.mockResolvedValue({ ...TEST_BUSINESS, setupDone: false });
  // Como la base: después de terminar, get_business dice que ya está hecha
  mockComplete.mockImplementation(async () => {
    mockGetBusiness.mockResolvedValue(TEST_BUSINESS);
    return { adjustments: 0, categories: 4 };
  });
  await openApp();
  expect(await screen.findByText("Tus productos")).toBeOnTheScreen();
  expect(screen).toHavePathname("/setup");
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Siguiente" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Terminar" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Ir a Inicio" }));
  expect(await screen.findByText("Don Pipos")).toBeOnTheScreen();
  expect(screen).toHavePathname("/home");
  expect(await screen.findByText("Anota tu primer pedido")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Entendido" }));
  expect(screen.queryByText("Anota tu primer pedido")).toBeNull();
});

const ROUTES = {
  "setup/_layout": SetupLayout,
  "setup/index": SetupProducts,
  "setup/stock": SetupStock,
  "setup/expenses": SetupExpenses,
  "setup/done": SetupDoneRoute,
};

async function renderSetup(): Promise<QueryClient> {
  const client = createTestQueryClient();
  client.setQueryData(businessesKeys.all, { ...TEST_BUSINESS, setupDone: false });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    );
  }
  await renderRouter(ROUTES, { initialUrl: "/setup", wrapper: Providers });
  return client;
}

test("los tres pasos: atrás no pierde lo puesto, «Terminar» guarda una vez y «Ir a Inicio» deja el consejo", async () => {
  let answer: (value: unknown) => void = () => undefined;
  mockComplete.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const client = await renderSetup();

  expect(await screen.findByText("Coqueta")).toBeOnTheScreen();
  expect(screen.getAllByText("S/ 12.00")).toHaveLength(TEST_PRODUCTS.length);
  expect(screen.getByText("Paso 1 de 3")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));

  expect(await screen.findByText("Tu stock de hoy")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));

  expect(await screen.findByText("Tus tipos de gasto")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Delivery" }));
  await fireEvent.press(screen.getByRole("button", { name: "Paso anterior" }));
  expect(await screen.findByText("Tu stock de hoy")).toBeOnTheScreen();
  expect(screen.getByLabelText("Cantidad de Coqueta")).toHaveDisplayValue("2");
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));

  expect(await screen.findByText("Tus tipos de gasto")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Delivery" })).not.toBeSelected();
  const finish = screen.getByRole("button", { name: "Terminar" });
  await fireEvent.press(finish);
  await fireEvent.press(finish);
  expect(mockComplete).toHaveBeenCalledTimes(1);
  expect(mockComplete).toHaveBeenCalledWith({
    requestId: expect.any(String),
    stock: [
      { productId: COQUETA_ID, counted: 2 },
      { productId: LIMON_ID, counted: 0 },
    ],
    categories: [
      { name: "Insumos", icon: "basket-outline" },
      { name: "Empaques", icon: "package-variant-closed" },
      { name: "Servicios", icon: "fire" },
    ],
  });
  await act(async () => answer({ adjustments: 1, categories: 3 }));

  expect(await screen.findByText("Todo listo")).toBeOnTheScreen();
  expect(screen).toHavePathname("/setup/done");
  await fireEvent.press(screen.getByRole("button", { name: "Ir a Inicio" }));
  expect(await AsyncStorage.getItem("donpipos.firstTip")).toBe("pending");
  expect(client.getQueryData<Business>(businessesKeys.all)?.setupDone).toBe(true);
});

test("si ya estaba hecha (conflict), «Terminar» lleva a «Todo listo» igual", async () => {
  mockComplete.mockRejectedValue(new AppError("conflict"));
  await renderSetup();
  await act(() => router.navigate("/setup/expenses"));
  await fireEvent.press(await screen.findByRole("button", { name: "Terminar" }));
  expect(await screen.findByText("Todo listo")).toBeOnTheScreen();
});

test("sin señal, «Terminar» lo dice y no sale nada", async () => {
  mockComplete.mockRejectedValue(new AppError("offline"));
  await renderSetup();
  await act(() => router.navigate("/setup/expenses"));
  await fireEvent.press(await screen.findByRole("button", { name: "Terminar" }));
  expect(await screen.findByText("Sin conexión. Revisa tu señal y vuelve a intentar.")).toBeOnTheScreen();
  expect(screen).toHavePathname("/setup/expenses");
});
