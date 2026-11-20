// Si no se puede saber si falta la puesta en marcha (get_business falla), la app entra a Inicio: nunca se queda
// bloqueada. En su propio archivo: el layout raíz guarda lo pedido en un cliente de consultas por archivo
import { fireEvent, screen } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { renderRouter } from "expo-router/testing-library";

import { AppError } from "@/lib/errors";
import { hashPin } from "@/lib/local-pin";

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
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => {
    throw new (jest.requireActual("@/lib/errors").AppError)("unexpected");
  },
}));

test("si get_business falla, entra a Inicio", async () => {
  expect(AppError).toBeDefined();
  await SecureStore.setItemAsync("auth.local-pin", JSON.stringify(await hashPin("197346")));
  await SecureStore.setItemAsync("auth.phone", "+51900000901");
  await renderRouter("src/app", { initialUrl: "/" });
  expect(await screen.findByText("Escribe tu PIN")).toBeOnTheScreen();
  for (const digit of "197346") await fireEvent.press(screen.getByRole("button", { name: digit }));
  expect(await screen.findByText("Don Pipos")).toBeOnTheScreen();
  expect(screen).toHavePathname("/home");
});
