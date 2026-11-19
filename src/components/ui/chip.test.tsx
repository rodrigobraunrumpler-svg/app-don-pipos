import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { Chip } from "./chip";

test("dice si está elegido y avisa al tocarlo", async () => {
  const onPress = jest.fn();
  await renderWithProviders(<Chip label="Rota" selected onPress={onPress} />);
  expect(screen.getByRole("button", { name: "Rota" })).toBeSelected();
  await fireEvent.press(screen.getByRole("button", { name: "Rota" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("sin elegir", async () => {
  await renderWithProviders(<Chip label="Regalo" selected={false} onPress={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Regalo" })).not.toBeSelected();
});
