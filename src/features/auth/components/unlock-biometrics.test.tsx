import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { UnlockContext, type AccessState } from "../hooks/unlock-context";
import { UnlockBiometrics } from "./unlock-biometrics";

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

test("pide la huella al abrir, y «Usar mi PIN» pasa al PIN", async () => {
  const value = access({ locked: true, biometricsEnabled: true, unlockWithBiometrics: jest.fn(async () => false) });
  const onUsePin = jest.fn();
  await renderWithProviders(
    <UnlockContext.Provider value={value}>
      <UnlockBiometrics onUsePin={onUsePin} />
    </UnlockContext.Provider>,
  );
  await waitFor(() => expect(value.unlockWithBiometrics).toHaveBeenCalledTimes(1));
  expect(screen.getByText("Hola de nuevo")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Entrar con huella" }));
  expect(value.unlockWithBiometrics).toHaveBeenCalledTimes(2);
  await fireEvent.press(screen.getByRole("button", { name: "Usar mi PIN" }));
  expect(onUsePin).toHaveBeenCalledTimes(1);
});
