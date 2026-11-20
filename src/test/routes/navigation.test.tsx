// El recorrido completo con las rutas de verdad: ingresar, ofrecer la huella, las pestañas, el bloqueo al volver,
// entrar con el PIN, volver a Ingresar cuando la sesión se cierra desde el servidor, y una sesión que reaparece sola.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { renderRouter } from "expo-router/testing-library";
import { AppState, type AppStateStatus } from "react-native";

import { formatLongDate } from "@/lib/dates";

// ¿Hay una sesión guardada en el celular? Cada cambio avisa, como Supabase
let mockStored = false;
let mockListener: (() => void) | undefined;
const mockStore = (stored: boolean) => {
  mockStored = stored;
  mockListener?.();
};
jest.mock("@/features/auth/api/session", () => ({
  getSessionState: async () => (mockStored ? "signed-in" : "signed-out"),
  onSessionChange: (listener: () => void) => {
    mockListener = listener;
    return () => undefined;
  },
  signOutHere: async () => mockStore(false),
}));
// Como el servidor: con el PIN correcto guarda la sesión. La respuesta espera a la prueba: así se ve qué pasa entre
// que la sesión queda guardada y el PIN local también
let mockRelease: () => void = () => undefined;
jest.mock("@/features/auth/api/pin", () => ({
  signInWithPin: async (_phone: string, pin: string) => {
    if (pin !== "197346") return { status: "wrong_pin", attemptsLeft: 4 };
    mockStore(true);
    await new Promise<void>((resolve) => {
      mockRelease = resolve;
    });
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
  // La sesión ya está guardada y el PIN local todavía no: sigue en Ingresar, sin pasar por Entrar ni por las pestañas
  // renderRouter usa un reloj falso: se avanza a mano para que la sesión se vuelva a leer
  await act(() => jest.advanceTimersByTimeAsync(100));
  expect(screen.getByText("Ingresa a tu app")).toBeOnTheScreen();
  expect(screen.queryByText("Escribe tu PIN")).toBeNull();
  await act(async () => mockRelease());

  expect(await screen.findByText("¿Entrar con tu huella?")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));

  expect(await screen.findByText("Don Pipos")).toBeOnTheScreen();
  expect(screen.getByText(formatLongDate(new Date()))).toBeOnTheScreen();

  await act(() => appStateHandlers.forEach((handler) => handler("background")));
  await act(() => appStateHandlers.forEach((handler) => handler("active")));
  expect(await screen.findByText("Escribe tu PIN")).toBeOnTheScreen();
  await type("197346");
  expect(await screen.findByText("Don Pipos")).toBeOnTheScreen();

  // Cerrar la sesión borra los avisos del celular: llevan nombres de clientes
  jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockClear();
  jest.mocked(Notifications.dismissAllNotificationsAsync).mockClear();
  await act(() => mockStore(false));
  expect(await screen.findByText("Ingresa a tu app")).toBeOnTheScreen();
  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  expect(Notifications.dismissAllNotificationsAsync).toHaveBeenCalled();

  // Una sesión que reaparece sin ingresar en este celular pide el PIN: nunca abre las pestañas
  await act(() => mockStore(true));
  expect(await screen.findByText("Escribe tu PIN")).toBeOnTheScreen();
  expect(screen.queryByText("Don Pipos")).toBeNull();
});
