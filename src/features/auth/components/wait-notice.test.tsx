import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { WaitNotice } from "./wait-notice";

// Jueves 19 de noviembre de 2026, 11:40 en Lima
const NOW = new Date("2026-11-19T16:40:00.000Z");
beforeEach(() => jest.useFakeTimers({ now: NOW, advanceTimers: true }));
afterEach(() => jest.useRealTimers());

test("una espera que termina hoy dice hasta qué hora, con la hora de Lima", async () => {
  await renderWithProviders(<WaitNotice retryAt={new Date("2026-11-19T17:40:00.000Z")} onBack={jest.fn()} />);
  expect(screen.getByText("Espera hasta las 12:40")).toBeOnTheScreen();
  expect(
    screen.getByText("Hubo varios intentos con un PIN equivocado. Por seguridad, cada vez la espera es más larga."),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/bloqueada/)).toBeNull();
});

test("una espera de 24 horas dice que termina mañana", async () => {
  await renderWithProviders(<WaitNotice retryAt={new Date("2026-11-20T16:40:00.000Z")} onBack={jest.fn()} />);
  expect(screen.getByText("Espera hasta mañana a las 11:40")).toBeOnTheScreen();
});

test("a la una dice «a la 01:20», no «a las»", async () => {
  await renderWithProviders(<WaitNotice retryAt={new Date("2026-11-20T06:20:00.000Z")} onBack={jest.fn()} />);
  expect(screen.getByText("Espera hasta mañana a la 01:20")).toBeOnTheScreen();
});
