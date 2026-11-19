import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { PinDots } from "./pin-dots";

test("el lector de pantalla dice cuántos números van", async () => {
  await renderWithProviders(<PinDots filled={3} />);
  expect(screen.getByLabelText("3 de 6 números")).toBeOnTheScreen();
});
