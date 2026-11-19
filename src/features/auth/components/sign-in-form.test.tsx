import { onlineManager } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { UnlockContext, type AccessState } from "../hooks/unlock-context";
import { SignInForm } from "./sign-in-form";

const mockSignIn = jest.fn();
jest.mock("../api/pin", () => ({ signInWithPin: (...args: unknown[]) => mockSignIn(...args), changePin: jest.fn() }));
let mockSupportWhatsapp: string | undefined = "51900000999";
jest.mock("@/lib/env", () => ({
  get appEnv() {
    return {
      ok: true,
      env: {
        supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
        supabaseKey: "sb_publishable_x",
        supportWhatsapp: mockSupportWhatsapp,
      },
    };
  },
}));

function access(overrides: Partial<AccessState> = {}): AccessState {
  return {
    ready: true,
    locked: false,
    lockedOut: false,
    phone: "+51900000901",
    biometricsEnabled: false,
    autoLockMinutes: 5,
    offerBiometrics: false,
    sessionStatus: "signed-in",
    rememberSignIn: jest.fn(async () => undefined),
    rememberPin: jest.fn(async () => undefined),
    unlockWithPin: jest.fn(async () => ({ ok: true }) as const),
    unlockWithBiometrics: jest.fn(async () => true),
    setBiometricsEnabled: jest.fn(async () => true),
    setAutoLockMinutes: jest.fn(async () => undefined),
    answerBiometricsOffer: jest.fn(async () => undefined),
    signOutHere: jest.fn(async () => undefined),
    lock: jest.fn(),
    dismissLockedOut: jest.fn(),
    ...overrides,
  };
}

async function type(digits: string) {
  for (const digit of digits) await fireEvent.press(screen.getByRole("button", { name: digit }));
}

async function setup(overrides: Partial<AccessState> = {}) {
  const value = access(overrides);
  await renderWithProviders(
    <UnlockContext.Provider value={value}>
      <SignInForm />
    </UnlockContext.Provider>,
  );
  return value;
}

beforeEach(() => {
  mockSignIn.mockReset();
  mockSupportWhatsapp = "51900000999";
  onlineManager.setOnline(true);
});

test("al sexto número ingresa una sola vez y muestra «Comprobando…»", async () => {
  let finish: (value: unknown) => void = () => undefined;
  mockSignIn.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
  const value = await setup({ phone: null });
  await fireEvent.changeText(screen.getByLabelText("Número de celular"), "900000901");
  await type("19734");
  expect(mockSignIn).not.toHaveBeenCalled();
  await type("6");
  expect(screen.getByText("Comprobando…")).toBeOnTheScreen();
  await type("1");
  expect(mockSignIn).toHaveBeenCalledTimes(1);
  expect(mockSignIn).toHaveBeenCalledWith("900000901", "197346");
  finish({ status: "ok" });
  await waitFor(() => expect(value.rememberSignIn).toHaveBeenCalledWith("+51900000901", "197346"));
});

test("con un PIN equivocado dice cuántos intentos quedan y vacía los puntos", async () => {
  mockSignIn.mockResolvedValueOnce({ status: "wrong_pin", attemptsLeft: 3 });
  await setup();
  await type("000001");
  expect(await screen.findByText("PIN incorrecto. Te quedan 3 intentos.")).toBeOnTheScreen();
  expect(screen.getByLabelText("0 de 6 números")).toBeOnTheScreen();
});

test("con la espera, muestra la hora de Lima", async () => {
  mockSignIn.mockResolvedValueOnce({ status: "locked", retryAt: new Date("2026-11-19T16:55:00.000Z") });
  await setup();
  await type("000001");
  expect(await screen.findByText("Espera 15 minutos")).toBeOnTheScreen();
  expect(
    screen.getByText("Hubo 5 intentos con un PIN equivocado. Por seguridad, podrás intentarlo otra vez a las 11:55."),
  ).toBeOnTheScreen();
});

test("con la cuenta bloqueada lo dice", async () => {
  mockSignIn.mockResolvedValueOnce({ status: "hard_locked" });
  await setup();
  await type("000001");
  expect(await screen.findByText("Tu cuenta está bloqueada")).toBeOnTheScreen();
});

test("sin señal, avisa y apaga el teclado", async () => {
  onlineManager.setOnline(false);
  await setup();
  expect(screen.getByText("Sin conexión. Para ingresar la primera vez necesitas internet.")).toBeOnTheScreen();
  await type("197346");
  expect(mockSignIn).not.toHaveBeenCalled();
});

test("sin el WhatsApp del equipo no hay «Olvidé mi PIN»", async () => {
  mockSupportWhatsapp = undefined;
  await setup();
  expect(screen.queryByText("Olvidé mi PIN")).toBeNull();
});
