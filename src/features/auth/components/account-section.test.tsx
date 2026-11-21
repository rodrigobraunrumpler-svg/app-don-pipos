import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/render";

import { UnlockContext, type AccessState } from "../hooks/unlock-context";
import { AccountSection } from "./account-section";

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
    signingIn: false,
    beginSignIn: jest.fn(),
    endSignIn: jest.fn(),
    ...overrides,
  };
}

async function setup(overrides: Partial<AccessState> = {}) {
  const value = access(overrides);
  const onChangePin = jest.fn();
  await renderWithProviders(
    <UnlockContext.Provider value={value}>
      <AccountSection onChangePin={onChangePin} />
    </UnlockContext.Provider>,
  );
  return { value, onChangePin };
}

test("muestra el número del dueño", async () => {
  await setup();
  expect(screen.getByText("+51 900 000 901")).toBeOnTheScreen();
});

test("el interruptor activa la huella; si el celular no tiene, lo dice", async () => {
  const { value } = await setup({ setBiometricsEnabled: jest.fn(async () => false) });
  await fireEvent(screen.getByRole("switch", { name: "Entrar con huella" }), "valueChange", true);
  expect(value.setBiometricsEnabled).toHaveBeenCalledWith(true);
  expect(await screen.findByText("Este celular no tiene una huella registrada.")).toBeOnTheScreen();
});

test("pedir huella o PIN: elegir «Al minuto» lo guarda", async () => {
  const { value } = await setup();
  expect(screen.getByText("A los 5 min")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Pedir huella o PIN" }));
  await fireEvent.press(screen.getByRole("button", { name: "Al minuto" }));
  expect(value.setAutoLockMinutes).toHaveBeenCalledWith(1);
});

test("«Cambiar PIN» y «Cerrar sesión en este celular»", async () => {
  const { value, onChangePin } = await setup();
  await fireEvent.press(screen.getByRole("button", { name: "Cambiar PIN" }));
  expect(onChangePin).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión en este celular" }));
  expect(value.signOutHere).toHaveBeenCalledTimes(1);
});

test("se titula «Tu cuenta y este celular» y pone lo que le pasan antes de «Cambiar PIN»", async () => {
  await renderWithProviders(
    <UnlockContext.Provider value={access()}>
      <AccountSection onChangePin={jest.fn()} extra={<Text>Recordatorios (DEMO)</Text>} />
    </UnlockContext.Provider>,
  );
  expect(screen.getByRole("header", { name: "Tu cuenta y este celular" })).toBeOnTheScreen();
  const tree = JSON.stringify(screen.toJSON());
  expect(tree.indexOf("Recordatorios (DEMO)")).toBeGreaterThan(-1);
  expect(tree.indexOf("Recordatorios (DEMO)")).toBeLessThan(tree.indexOf("Cambiar PIN"));
});
