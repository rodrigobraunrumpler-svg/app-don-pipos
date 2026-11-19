import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import type { ReactNode } from "react";

import { CACHE_STORAGE_KEY } from "@/lib/query";

import { useUnlockState, type SessionStatus } from "./use-unlock-state";

const mockSignOut = jest.fn(async () => undefined);
jest.mock("../api/session", () => ({
  signOutHere: () => mockSignOut(),
  getSessionState: jest.fn(),
  onSessionChange: jest.fn(),
}));

const PHONE = "+51900000901";

beforeEach(async () => {
  for (const key of ["auth.local-pin", "auth.phone", "auth.pin-errors"]) await SecureStore.deleteItemAsync(key);
  await AsyncStorage.clear();
  mockSignOut.mockClear();
  jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
});

async function setup(sessionStatus: SessionStatus = "signed-in") {
  // gcTime infinito: sin temporizadores que dejen a Jest esperando al terminar
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = await renderHook((status: SessionStatus) => useUnlockState({ sessionStatus: status }), {
    wrapper,
    initialProps: sessionStatus,
  });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

async function call<T>(action: () => Promise<T>): Promise<T> {
  let value: T | undefined;
  await act(async () => {
    value = await action();
  });
  return value as T;
}

test("después de ingresar, el PIN local desbloquea", async () => {
  const { result } = await setup("signed-out");
  await call(() => result.current.rememberSignIn(PHONE, "197346"));
  expect(result.current.locked).toBe(false);
  expect(result.current.phone).toBe(PHONE);
  await act(() => result.current.lock());
  expect(result.current.locked).toBe(true);
  expect(await call(() => result.current.unlockWithPin("197346"))).toEqual({ ok: true });
  expect(result.current.locked).toBe(false);
});

test("cinco PIN equivocados cierran la sesión de este celular y borran lo guardado", async () => {
  const { result } = await setup("signed-out");
  await call(() => result.current.rememberSignIn(PHONE, "197346"));
  const answers = [];
  for (let attempt = 0; attempt < 5; attempt += 1)
    answers.push(await call(() => result.current.unlockWithPin("000001")));
  expect(answers).toEqual([
    { ok: false, attemptsLeft: 4 },
    { ok: false, attemptsLeft: 3 },
    { ok: false, attemptsLeft: 2 },
    { ok: false, attemptsLeft: 1 },
    { ok: false, attemptsLeft: 0 },
  ]);
  expect(result.current.lockedOut).toBe(true);
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(await SecureStore.getItemAsync("auth.local-pin")).toBeNull();
  await act(() => result.current.dismissLockedOut());
  expect(result.current.lockedOut).toBe(false);
});

test("al abrir la app con sesión empieza bloqueada, y reabrirla no reinicia el contador", async () => {
  const first = await setup("signed-out");
  await call(() => first.result.current.rememberSignIn(PHONE, "197346"));
  for (let attempt = 0; attempt < 3; attempt += 1) await call(() => first.result.current.unlockWithPin("000001"));
  await first.unmount();

  const second = await setup("signed-in");
  expect(second.result.current.locked).toBe(true);
  expect(await call(() => second.result.current.unlockWithPin("000001"))).toEqual({ ok: false, attemptsLeft: 1 });
});

test("una sesión que aparece sin ingresar en este celular no abre la app", async () => {
  const hook = await setup("loading");
  expect(hook.result.current.locked).toBe(true);
  await hook.rerender("signed-out");
  expect(hook.result.current.locked).toBe(true);
  await hook.rerender("signed-in");
  expect(hook.result.current.locked).toBe(true);
});

test("si la sesión se pierde, la app vuelve a bloquearse, y sigue así si la sesión reaparece", async () => {
  const hook = await setup("signed-in");
  await call(() => hook.result.current.rememberSignIn(PHONE, "197346"));
  expect(hook.result.current.locked).toBe(false);
  await hook.rerender("signed-out");
  await hook.rerender("signed-in");
  expect(hook.result.current.locked).toBe(true);
});

test("el ingreso en este celular queda marcado hasta guardar el PIN, o hasta que falle", async () => {
  const hook = await setup("signed-out");
  await act(() => hook.result.current.beginSignIn());
  expect(hook.result.current.signingIn).toBe(true);
  await act(() => hook.result.current.endSignIn());
  expect(hook.result.current.signingIn).toBe(false);

  await act(() => hook.result.current.beginSignIn());
  await hook.rerender("signed-in");
  expect(hook.result.current.locked).toBe(true);
  await call(() => hook.result.current.rememberSignIn(PHONE, "197346"));
  expect(hook.result.current).toMatchObject({ signingIn: false, locked: false });
});

test("si lo guardado en el celular no se puede leer, la app abre igual con lo de siempre", async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error("Keystore"));
  const { result } = await setup("signed-in");
  expect(result.current).toMatchObject({ phone: null, biometricsEnabled: false, autoLockMinutes: 5 });
});

test("sin un PIN guardado no hay cómo entrar sin internet: se pide ingresar de nuevo", async () => {
  const { result } = await setup("signed-in");
  expect(await call(() => result.current.unlockWithPin("197346"))).toEqual({ ok: false, attemptsLeft: 0 });
  expect(result.current.lockedOut).toBe(true);
});

test("sin huella registrada no se activa ni desbloquea; con huella, sí", async () => {
  const { result } = await setup("signed-out");
  await call(() => result.current.rememberSignIn(PHONE, "197346"));
  jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);
  expect(await call(() => result.current.setBiometricsEnabled(true))).toBe(false);
  await act(() => result.current.lock());
  expect(await call(() => result.current.unlockWithBiometrics())).toBe(false);
  expect(result.current.locked).toBe(true);

  jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
  expect(await call(() => result.current.setBiometricsEnabled(true))).toBe(true);
  expect(await call(() => result.current.unlockWithBiometrics())).toBe(true);
  expect(result.current.locked).toBe(false);
});

test("los ajustes se guardan en el celular: 5 minutos por defecto", async () => {
  const first = await setup("signed-out");
  expect(first.result.current.autoLockMinutes).toBe(5);
  await call(() => first.result.current.setAutoLockMinutes(1));
  await first.unmount();
  const second = await setup("signed-out");
  expect(second.result.current.autoLockMinutes).toBe(1);
});

test("cerrar la sesión en este celular borra lo guardado: PIN, número, ajustes y caché", async () => {
  const { result } = await setup("signed-in");
  await call(() => result.current.rememberSignIn(PHONE, "197346"));
  await call(() => result.current.setAutoLockMinutes(1));
  await call(() => result.current.setBiometricsEnabled(true));
  await AsyncStorage.setItem(CACHE_STORAGE_KEY, "{}");
  await call(() => result.current.signOutHere());
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  for (const key of ["auth.local-pin", "auth.phone", "auth.pin-errors"])
    expect(await SecureStore.getItemAsync(key)).toBeNull();
  for (const key of ["auth.auto-lock", "auth.biometrics", CACHE_STORAGE_KEY])
    expect(await AsyncStorage.getItem(key)).toBeNull();
  expect(result.current).toMatchObject({ phone: null, biometricsEnabled: false, autoLockMinutes: 5, locked: true });
});

test("después de ingresar ofrece la huella si el celular la tiene", async () => {
  const { result } = await setup("signed-out");
  await call(() => result.current.rememberSignIn(PHONE, "197346"));
  expect(result.current.offerBiometrics).toBe(true);
  await call(() => result.current.answerBiometricsOffer(false));
  expect(result.current.offerBiometrics).toBe(false);
  expect(result.current.biometricsEnabled).toBe(false);
  await call(() => result.current.rememberSignIn(PHONE, "197346"));
  await call(() => result.current.answerBiometricsOffer(true));
  expect(result.current.biometricsEnabled).toBe(true);
});

test("sin huella registrada no la ofrece", async () => {
  jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);
  const { result } = await setup("signed-out");
  await call(() => result.current.rememberSignIn(PHONE, "197346"));
  expect(result.current.offerBiometrics).toBe(false);
});
