import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { UnlockContext, type AccessState } from "../hooks/unlock-context";
import { UnlockPin } from "./unlock-pin";

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

async function setup(overrides: Partial<AccessState>, onUseBiometrics?: () => void) {
  const value = access({ locked: true, ...overrides });
  await renderWithProviders(
    <UnlockContext.Provider value={value}>
      <UnlockPin onUseBiometrics={onUseBiometrics} />
    </UnlockContext.Provider>,
  );
  return value;
}

test("un PIN equivocado dice cuántos intentos quedan", async () => {
  const value = await setup({ unlockWithPin: jest.fn(async () => ({ ok: false, attemptsLeft: 2 }) as const) });
  await type("000001");
  expect(value.unlockWithPin).toHaveBeenCalledWith("000001");
  expect(await screen.findByText("PIN incorrecto. Te quedan 2 intentos.")).toBeOnTheScreen();
});

test("con la huella activa, su tecla vuelve a la huella", async () => {
  const onUseBiometrics = jest.fn();
  await setup({ biometricsEnabled: true }, onUseBiometrics);
  await fireEvent.press(screen.getByRole("button", { name: "Entrar con huella" }));
  expect(onUseBiometrics).toHaveBeenCalledTimes(1);
});
