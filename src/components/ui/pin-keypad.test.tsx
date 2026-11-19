import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/render";

import { PinKeypad } from "./pin-keypad";

test("cada tecla avisa su número y «Borrar» borra", async () => {
  const onDigit = jest.fn();
  const onDelete = jest.fn();
  await renderWithProviders(<PinKeypad onDigit={onDigit} onDelete={onDelete} />);
  await fireEvent.press(screen.getByRole("button", { name: "7" }));
  await fireEvent.press(screen.getByRole("button", { name: "0" }));
  await fireEvent.press(screen.getByRole("button", { name: "Borrar" }));
  expect(onDigit.mock.calls).toEqual([["7"], ["0"]]);
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test("apagado, no responde", async () => {
  const onDigit = jest.fn();
  await renderWithProviders(<PinKeypad onDigit={onDigit} onDelete={jest.fn()} disabled />);
  await fireEvent.press(screen.getByRole("button", { name: "5" }));
  expect(onDigit).not.toHaveBeenCalled();
});

test("a la izquierda del 0 va lo que se le pase", async () => {
  await renderWithProviders(<PinKeypad onDigit={jest.fn()} onDelete={jest.fn()} left={<Text>huella</Text>} />);
  expect(screen.getByText("huella")).toBeOnTheScreen();
});
