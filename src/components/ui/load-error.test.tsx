import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { LoadError } from "./load-error";

test("dice qué no se pudo cargar y vuelve a intentar", async () => {
  const onRetry = jest.fn();
  await renderWithProviders(<LoadError what="tus productos" onRetry={onRetry} />);
  expect(screen.getByText("No se pudo cargar tus productos")).toBeOnTheScreen();
  expect(
    screen.getByText("Revisa tu conexión y vuelve a intentar. Si sigue igual, escribe a soporte."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
