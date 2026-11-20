// Si no se puede saber si falta la puesta en marcha (get_business falla), la app entra a Inicio: nunca se queda
// bloqueada. En su propio archivo: el layout raíz guarda lo pedido en un cliente de consultas por archivo
import { focusManager } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
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
// Falla; o, después, se queda pidiendo (la señal va y viene)
let mockHang = false;
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => {
    if (mockHang) return new Promise(() => undefined);
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

  // Volver a la app lo pide otra vez: mientras tanto Inicio sigue a la vista, no se desarma ni queda en blanco
  await act(() => jest.advanceTimersByTimeAsync(6000));
  mockHang = true;
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
  await act(() => jest.advanceTimersByTimeAsync(100));
  expect(screen.getByText("Don Pipos")).toBeOnTheScreen();
  expect(screen).toHavePathname("/home");
});
