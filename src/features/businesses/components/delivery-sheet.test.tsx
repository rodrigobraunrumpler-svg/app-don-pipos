import { fireEvent, screen } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { TEST_BUSINESS } from "@/test/business";
import { renderWithProviders } from "@/test/render";

import type { Business } from "../schema/business";
import { DeliverySheet } from "./delivery-sheet";

const mockUpdate = jest.fn();
const mockGetBusiness = jest.fn();
jest.mock("../api/business", () => ({
  getBusiness: () => mockGetBusiness(),
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

beforeEach(() => {
  mockUpdate.mockReset();
  mockGetBusiness.mockReset();
  mockGetBusiness.mockResolvedValue(TEST_BUSINESS);
});

test("el costo del delivery se guarda en céntimos y cierra la hoja", async () => {
  mockUpdate.mockResolvedValue({ ...TEST_BUSINESS.settings, deliveryFeeCents: 700, version: 2 });
  const onClose = jest.fn();
  await renderWithProviders(<DeliverySheet onClose={onClose} />);
  expect(
    await screen.findByText("Lo que cobras por llevar un pedido. Se suma solo al elegir delivery."),
  ).toBeOnTheScreen();
  expect(await screen.findByDisplayValue("5.00")).toBeOnTheScreen();
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

test("si otro cambio llegó antes, lo dice con lo guardado ahora, la hoja sigue abierta y lo escrito queda", async () => {
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  const onClose = jest.fn();
  await renderWithProviders(<DeliverySheet onClose={onClose} />);
  await fireEvent.changeText(await screen.findByLabelText("Costo"), "7");
  // Lo que guardó el otro cambio: llega al volver a pedir el negocio
  const newer: Business = {
    ...TEST_BUSINESS,
    settings: { ...TEST_BUSINESS.settings, deliveryFeeCents: 800, version: 2 },
  };
  mockGetBusiness.mockResolvedValue(newer);
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Otro cambio llegó antes: revisa los ajustes y vuelve a guardar.")).toBeOnTheScreen();
  expect(await screen.findByText("Lo guardado ahora: S/\u00a08.00")).toBeOnTheScreen();
  expect(mockGetBusiness).toHaveBeenCalledTimes(2);
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("7")).toBeOnTheScreen();
});

test("el delivery llega hasta S/ 10,000", async () => {
  await renderWithProviders(<DeliverySheet onClose={jest.fn()} />);
  await fireEvent.changeText(await screen.findByLabelText("Costo"), "10000.01");
  expect(screen.getByText("Hasta S/\u00a010,000.00.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Costo"), "10000");
  expect(screen.queryByText("Hasta S/\u00a010,000.00.")).toBeNull();
  expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
});
