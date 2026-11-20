import { fireEvent, screen } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { TEST_BUSINESS } from "@/test/business";
import { renderWithProviders } from "@/test/render";

import { DeliverySheet } from "./delivery-sheet";

const mockUpdate = jest.fn();
jest.mock("../api/business", () => ({
  getBusiness: async () => jest.requireActual("@/test/business").TEST_BUSINESS,
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

beforeEach(() => mockUpdate.mockReset());

test("el costo del delivery se guarda en céntimos y cierra la hoja", async () => {
  mockUpdate.mockResolvedValue({ ...TEST_BUSINESS.settings, deliveryFeeCents: 700, version: 2 });
  const onClose = jest.fn();
  await renderWithProviders(<DeliverySheet onClose={onClose} />);
  expect(
    await screen.findByText("Lo que cobras por llevar un pedido. Se suma solo al elegir delivery."),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("5.00")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Costo"), "7");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(mockUpdate).toHaveBeenCalledWith(1, { deliveryFeeCents: 700 });
  expect(onClose).toHaveBeenCalled();
});

test("letras o vacío no se guardan", async () => {
  await renderWithProviders(<DeliverySheet onClose={jest.fn()} />);
  await fireEvent.changeText(await screen.findByLabelText("Costo"), "cinco");
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Costo"), "");
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
});

test("si otro cambio llegó antes, lo dice, la hoja sigue abierta y lo escrito queda", async () => {
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  const onClose = jest.fn();
  await renderWithProviders(<DeliverySheet onClose={onClose} />);
  await fireEvent.changeText(await screen.findByLabelText("Costo"), "7");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Otro cambio llegó antes: revisa los ajustes y vuelve a guardar.")).toBeOnTheScreen();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("7")).toBeOnTheScreen();
});
