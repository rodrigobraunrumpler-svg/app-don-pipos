import { fireEvent, screen } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";

import { TEST_BUSINESS } from "@/test/business";
import { renderWithProviders } from "@/test/render";

import { ProductionSheet } from "./production-sheet";

const mockUpdate = jest.fn();
let mockDays = 7;
jest.mock("../api/business", () => ({
  getBusiness: async () => {
    const { TEST_BUSINESS: business } = jest.requireActual("@/test/business");
    return { ...business, settings: { ...business.settings, productionIntervalDays: mockDays } };
  },
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

beforeEach(() => {
  mockUpdate.mockReset();
  mockDays = 7;
});

test("cada cuántos días produce, con su nota, y se guarda", async () => {
  mockUpdate.mockResolvedValue({ ...TEST_BUSINESS.settings, productionIntervalDays: 3, version: 2 });
  const onClose = jest.fn();
  await renderWithProviders(<ProductionSheet onClose={onClose} />);
  expect(await screen.findByText("Cada 7 días: Inicio y Stock sugieren para ese periodo.")).toBeOnTheScreen();
  expect(screen.getByText("La sugerencia cubre los días hasta tu siguiente tanda.")).toBeOnTheScreen();
  for (let i = 0; i < 4; i += 1)
    await fireEvent.press(screen.getByRole("button", { name: "Menos días entre producciones" }));
  expect(screen.getByText("Cada 3 días: Inicio y Stock sugieren para ese periodo.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(mockUpdate).toHaveBeenCalledWith(1, { productionIntervalDays: 3 });
  expect(onClose).toHaveBeenCalled();
});

test("si otro cambio llegó antes, dice lo guardado ahora", async () => {
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  await renderWithProviders(<ProductionSheet onClose={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Menos días entre producciones" }));
  mockDays = 5;
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Lo guardado ahora: Cada 5 días")).toBeOnTheScreen();
});
