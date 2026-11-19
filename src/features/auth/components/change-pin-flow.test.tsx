import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { UnlockContext, type AccessState } from "../hooks/unlock-context";
import { ChangePinFlow } from "./change-pin-flow";

const mockChangePin = jest.fn();
jest.mock("../api/pin", () => ({
  signInWithPin: jest.fn(),
  changePin: (...args: unknown[]) => mockChangePin(...args),
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
    signingIn: false,
    beginSignIn: jest.fn(),
    endSignIn: jest.fn(),
    ...overrides,
  };
}

async function type(digits: string) {
  for (const digit of digits) await fireEvent.press(screen.getByRole("button", { name: digit }));
}

async function setup() {
  const value = access();
  const onDone = jest.fn();
  await renderWithProviders(
    <UnlockContext.Provider value={value}>
      <ChangePinFlow onDone={onDone} />
    </UnlockContext.Provider>,
  );
  return { value, onDone };
}

beforeEach(() => mockChangePin.mockReset());

test("dos PIN nuevos distintos se avisan sin llamar al servidor", async () => {
  await setup();
  expect(screen.getByText("Tu PIN actual")).toBeOnTheScreen();
  await type("197346");
  expect(screen.getByText("Tu PIN nuevo")).toBeOnTheScreen();
  await type("582039");
  expect(screen.getByText("Repite tu PIN nuevo")).toBeOnTheScreen();
  await type("582030");
  expect(screen.getByText("Los dos PIN no coinciden.")).toBeOnTheScreen();
  expect(screen.getByText("Tu PIN nuevo")).toBeOnTheScreen();
  expect(mockChangePin).not.toHaveBeenCalled();
});

test("un PIN fácil o el mismo de antes se avisan sin llamar al servidor", async () => {
  await setup();
  await type("197346");
  await type("123456");
  expect(screen.getByText("Ese PIN es fácil de adivinar. Elige otro.")).toBeOnTheScreen();
  await type("197346");
  expect(screen.getByText("Es el mismo PIN que ya tienes.")).toBeOnTheScreen();
  expect(mockChangePin).not.toHaveBeenCalled();
});

test("si el servidor lo acepta, el celular guarda el PIN nuevo", async () => {
  mockChangePin.mockResolvedValueOnce({ status: "ok" });
  const { value, onDone } = await setup();
  await type("197346");
  await type("582039");
  await type("582039");
  expect(await screen.findByText("Listo, cambiaste tu PIN")).toBeOnTheScreen();
  expect(mockChangePin).toHaveBeenCalledWith("197346", "582039");
  expect(value.rememberPin).toHaveBeenCalledWith("582039");
  await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("con el PIN actual equivocado vuelve al primer paso", async () => {
  mockChangePin.mockResolvedValueOnce({ status: "wrong_pin", attemptsLeft: 4 });
  await setup();
  await type("000001");
  await type("582039");
  await type("582039");
  expect(await screen.findByText("PIN incorrecto. Te quedan 4 intentos.")).toBeOnTheScreen();
  expect(screen.getByText("Tu PIN actual")).toBeOnTheScreen();
});
