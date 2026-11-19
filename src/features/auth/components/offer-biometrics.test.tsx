import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { UnlockContext, type AccessState } from "../hooks/unlock-context";
import { OfferBiometrics } from "./offer-biometrics";

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

test("«Usar mi huella» la activa y «Ahora no» no", async () => {
  const value = access({ offerBiometrics: true });
  await renderWithProviders(
    <UnlockContext.Provider value={value}>
      <OfferBiometrics />
    </UnlockContext.Provider>,
  );
  expect(screen.getByText("¿Entrar con tu huella?")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Usar mi huella" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));
  expect(jest.mocked(value.answerBiometricsOffer).mock.calls).toEqual([[true], [false]]);
});
