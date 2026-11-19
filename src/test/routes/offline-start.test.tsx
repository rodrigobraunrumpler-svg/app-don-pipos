// Abrir la app sin señal y con el token vencido: Supabase no puede renovar la sesión, pero la guarda. La app pide el PIN
// (Entrar, no Ingresar), el PIN local abre las pestañas, y un aviso de sesión mientras está bloqueada no la abre.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { renderRouter } from "expo-router/testing-library";

import { hashPin } from "@/lib/local-pin";

let mockListener: (() => void) | undefined;
jest.mock("@/features/auth/api/session", () => ({
  getSessionState: async () => "signed-in",
  onSessionChange: (listener: () => void) => {
    mockListener = listener;
    return () => undefined;
  },
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
  getNetworkStateAsync: async () => ({ isConnected: false, isInternetReachable: false }),
}));

async function type(digits: string) {
  for (const digit of digits) await fireEvent.press(screen.getByRole("button", { name: digit }));
}

test("sin señal y con la sesión guardada, la app pide el PIN y el PIN local la abre", async () => {
  await SecureStore.setItemAsync("auth.local-pin", JSON.stringify(await hashPin("197346")));
  await SecureStore.setItemAsync("auth.phone", "+51900000901");
  await AsyncStorage.setItem("auth.auto-lock", "5");
  await renderRouter("src/app", { initialUrl: "/" });

  expect(await screen.findByText("Escribe tu PIN")).toBeOnTheScreen();
  // Supabase avisa (se renovó la sesión al volver la señal): sigue pidiendo el PIN
  await act(() => mockListener?.());
  expect(await screen.findByText("Escribe tu PIN")).toBeOnTheScreen();

  await type("197346");
  expect(await screen.findByText("Don Pipos")).toBeOnTheScreen();
});
