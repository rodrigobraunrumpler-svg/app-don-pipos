import { render, screen } from "@testing-library/react-native";

import Home from "@/app/index";

afterEach(() => jest.useRealTimers());

test("la portada muestra el nombre de la app y la fase", async () => {
  await render(<Home />);
  expect(screen.getByText("Don Pipos")).toBeOnTheScreen();
  expect(screen.getByText("Fase 0 lista")).toBeOnTheScreen();
});

test("la portada muestra la fecha de hoy en español y en hora de Lima", async () => {
  // Las 22:30 del jueves 19 en Lima: en UTC ya es viernes 20
  jest.useFakeTimers({ now: new Date("2026-11-20T03:30:00Z") });
  await render(<Home />);
  expect(screen.getByText("Jueves 19 de noviembre")).toBeOnTheScreen();
});
