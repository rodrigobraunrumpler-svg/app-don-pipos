import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { MoneyInput } from "./money-input";

test("muestra «S/» y avisa lo que se escribe", async () => {
  const onChangeText = jest.fn();
  await renderWithProviders(<MoneyInput label="Precio en soles" value="12.00" onChangeText={onChangeText} />);
  expect(screen.getByText("S/")).toBeOnTheScreen();
  expect(screen.getByLabelText("Precio en soles")).toHaveDisplayValue("12.00");
  await fireEvent.changeText(screen.getByLabelText("Precio en soles"), "12,50");
  expect(onChangeText).toHaveBeenCalledWith("12,50");
});
