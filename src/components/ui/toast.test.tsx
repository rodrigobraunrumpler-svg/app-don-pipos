import { act, fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { Toast } from "./toast";

afterEach(() => jest.useRealTimers());

test("muestra el aviso y su acción", async () => {
  const onAction = jest.fn();
  await renderWithProviders(
    <Toast message="Merma anotada: 2 Coqueta." actionLabel="Deshacer" onAction={onAction} onHide={jest.fn()} />,
  );
  expect(screen.getByText("Merma anotada: 2 Coqueta.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  expect(onAction).toHaveBeenCalledTimes(1);
});

test("se oculta solo a los 6 segundos", async () => {
  jest.useFakeTimers();
  const onHide = jest.fn();
  await renderWithProviders(<Toast message="Listo, se deshizo." onHide={onHide} />);
  expect(screen.queryByRole("button")).toBeNull();
  await act(() => jest.advanceTimersByTime(5999));
  expect(onHide).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(1));
  expect(onHide).toHaveBeenCalledTimes(1);
});
