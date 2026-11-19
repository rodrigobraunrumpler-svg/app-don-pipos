import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { useAutoLock } from "./use-auto-lock";

// Todos los que escuchan los cambios de AppState (React Native también escucha): la prueba les avisa a todos
let mockHandlers: ((state: AppStateStatus) => void)[] = [];
const change = (state: AppStateStatus) => mockHandlers.forEach((handler) => handler(state));

beforeEach(() => {
  mockHandlers = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
    mockHandlers.push(handler as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => jest.restoreAllMocks());

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 19, 16, minutes));

async function setup(minutes: 0 | 1 | 5 | 15) {
  let current = at(0);
  const onLock = jest.fn();
  await renderHook(() => useAutoLock({ minutes, enabled: true, onLock, now: () => current }));
  const move = async (state: AppStateStatus, minute: number) => {
    current = at(minute);
    await act(() => change(state));
  };
  return { onLock, move };
}

test("con 5 minutos, volver a los 4 no bloquea y a los 5 sí", async () => {
  const { onLock, move } = await setup(5);
  await move("background", 0);
  await move("active", 4);
  expect(onLock).not.toHaveBeenCalled();
  await move("background", 10);
  await move("active", 15);
  expect(onLock).toHaveBeenCalledTimes(1);
});

test("con 0 minutos, bloquea siempre al volver", async () => {
  const { onLock, move } = await setup(0);
  await move("background", 0);
  await move("active", 0);
  expect(onLock).toHaveBeenCalledTimes(1);
});

test("sin sesión no bloquea", async () => {
  const onLock = jest.fn();
  await renderHook(() => useAutoLock({ minutes: 0, enabled: false, onLock }));
  await act(() => change("background"));
  await act(() => change("active"));
  expect(onLock).not.toHaveBeenCalled();
});
