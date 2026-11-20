import { fireEvent, screen } from "@testing-library/react-native";

import { TEST_BUSINESS } from "@/test/business";
import { renderWithProviders } from "@/test/render";

import { LapsedSheet } from "./lapsed-sheet";

const mockUpdate = jest.fn();
jest.mock("../api/business", () => ({
  getBusiness: async () => jest.requireActual("@/test/business").TEST_BUSINESS,
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

test("a partir de cuántos días sin pedir un cliente sale en «No vuelven»", async () => {
  mockUpdate.mockResolvedValue({ ...TEST_BUSINESS.settings, lapsedAfterDays: 31, version: 2 });
  await renderWithProviders(<LapsedSheet onClose={jest.fn()} />);
  expect(await screen.findByText("Si un cliente no pide en 30 días, sale en «No vuelven».")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Más días sin pedir" }));
  expect(screen.getByText("Si un cliente no pide en 31 días, sale en «No vuelven».")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(mockUpdate).toHaveBeenCalledWith(1, { lapsedAfterDays: 31 });
});
