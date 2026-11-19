import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { UnlockContext, type AccessState } from "../hooks/unlock-context";
import { SignInView } from "./sign-in-view";

jest.mock("../api/pin", () => ({ signInWithPin: jest.fn(), changePin: jest.fn() }));

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

test("después de 5 errores del PIN local dice que cerró la sesión, y «Ingresar de nuevo» muestra el formulario", async () => {
  const value = access({ lockedOut: true, sessionStatus: "signed-out" });
  await renderWithProviders(
    <UnlockContext.Provider value={value}>
      <SignInView />
    </UnlockContext.Provider>,
  );
  expect(screen.getByText("Cerramos la sesión")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ingresar de nuevo" }));
  expect(value.dismissLockedOut).toHaveBeenCalledTimes(1);
});
