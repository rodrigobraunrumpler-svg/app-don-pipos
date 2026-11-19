// El recorrido completo con las rutas de verdad: ingresar, ofrecer la huella, las pestañas, el bloqueo al volver,
// entrar con el PIN y volver a Ingresar cuando la sesión se cierra desde el servidor.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { AppState, type AppStateStatus } from "react-native";

import { formatLongDate } from "@/lib/dates";

let mockSession: unknown = null;
let mockListener: ((session: unknown) => void) | undefined;
const mockSetSession = (session: unknown) => {
  mockSession = session;
  mockListener?.(session);
};
jest.mock("@/features/auth/api/session", () => ({
  getSession: async () => mockSession,
  onSessionChange: (listener: (session: unknown) => void) => {
    mockListener = listener;
    return () => undefined;
  },
  signOutHere: async () => mockSetSession(null),
}));
jest.mock("@/features/auth/api/pin", () => ({
  // Como el servidor: con el PIN correcto abre la sesión
  signInWithPin: async (_phone: string, pin: string) => {
    if (pin !== "197346") return { status: "wrong_pin", attemptsLeft: 4 };
    mockSetSession({ access_token: "token" });
    return { status: "ok" };
  },
  changePin: jest.fn(),
}));
let mockEnvOk = true;
jest.mock("@/lib/env", () => ({
  get appEnv() {
    return mockEnvOk
      ? {
          ok: true,
          env: {
            supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
            supabaseKey: "sb_publishable_x",
            supportWhatsapp: undefined,
          },
        }
      : { ok: false, problems: ["EXPO_PUBLIC_SUPABASE_URL tiene que ser la URL https del proyecto"] };
  },
}));
jest.mock("expo-network", () => ({
  addNetworkStateListener: () => ({ remove: jest.fn() }),
  getNetworkStateAsync: async () => ({ isConnected: true, isInternetReachable: true }),
}));

let appStateHandlers: ((state: AppStateStatus) => void)[] = [];
beforeEach(() => {
  appStateHandlers = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
    appStateHandlers.push(handler as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => jest.restoreAllMocks());

async function type(digits: string) {
  for (const digit of digits) await fireEvent.press(screen.getByRole("button", { name: digit }));
}

test("sin variables de entorno válidas, la app dice qué falta configurar", async () => {
  mockEnvOk = false;
  await renderRouter("src/app", { initialUrl: "/" });
  expect(await screen.findByText("Falta configurar la app")).toBeOnTheScreen();
  expect(screen.getByText("EXPO_PUBLIC_SUPABASE_URL tiene que ser la URL https del proyecto")).toBeOnTheScreen();
  mockEnvOk = true;
});

test("ingresar, la huella, las pestañas, el bloqueo al volver y la sesión que se cierra", async () => {
  // Pedir huella o PIN «al salir»: así el bloqueo no depende del reloj
  await AsyncStorage.setItem("auth.auto-lock", "0");
  await renderRouter("src/app", { initialUrl: "/" });

  expect(await screen.findByText("Ingresa a tu app")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Número de celular"), "900000901");
  await type("197346");

  expect(await screen.findByText("¿Entrar con tu huella?")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));

  expect(await screen.findByText("Don Pipos")).toBeOnTheScreen();
  expect(screen.getByText(formatLongDate(new Date()))).toBeOnTheScreen();

  await act(() => appStateHandlers.forEach((handler) => handler("background")));
  await act(() => appStateHandlers.forEach((handler) => handler("active")));
  expect(await screen.findByText("Escribe tu PIN")).toBeOnTheScreen();
  await type("197346");
  expect(await screen.findByText("Don Pipos")).toBeOnTheScreen();

  await act(() => mockSetSession(null));
  expect(await screen.findByText("Ingresa a tu app")).toBeOnTheScreen();
});
