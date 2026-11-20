import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import { LoyaltyScreen } from "./loyalty-screen";

const mockSettings = jest.fn();
const mockOverview = jest.fn();
const mockUpdate = jest.fn();
jest.mock("../api/loyalty", () => ({
  getLoyaltySettings: () => mockSettings(),
  getLoyaltyOverview: () => mockOverview(),
  updateLoyaltySettings: (input: unknown) => mockUpdate(input),
}));

const OFF = {
  isActive: false,
  stampUnit: "order",
  goal: 10,
  rewardKind: "free_item",
  rewardAmountCents: null,
  rewardText: null,
  version: 1,
};

beforeEach(() => {
  mockSettings.mockReset().mockResolvedValue(OFF);
  mockOverview.mockReset().mockResolvedValue({ goal: 10, customers: [] });
  mockUpdate
    .mockReset()
    .mockImplementation(async (input: Record<string, unknown>) => ({ ...OFF, ...input, version: 2 }));
});
afterEach(() => onlineManager.setOnline(true));

test("apagada explica cómo funciona, con la pregunta para decidir la regla", async () => {
  await renderWithProviders(<LoyaltyScreen onBack={jest.fn()} />);
  expect(await screen.findByText("La fidelidad está apagada")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "¿Quieres premiar a tus clientes frecuentes? Por ejemplo, por cada 10 compras, o por cada 10 alfajores, 1 gratis. ¿Qué premio darías y cada cuánto?",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Así la ve el cliente")).toBeNull();
});

test("encender, elegir por alfajor (la meta entra en su rango), un descuento con su monto y guardar todo", async () => {
  await renderWithProviders(<LoyaltyScreen onBack={jest.fn()} />);
  await fireEvent(await screen.findByLabelText("Fidelidad activa"), "valueChange", true);
  expect(screen.getByText("Así la ve el cliente")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Menos sellos para el premio" }));
  expect(screen.getByLabelText("Cantidad de sellos para el premio").props.value).toBe("9");
  await fireEvent.press(screen.getByRole("radio", { name: "Por alfajor" }));
  await fireEvent.press(screen.getByRole("button", { name: "Descuento" }));
  expect(screen.getByText("Escribe el monto del descuento.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Monto del descuento"), "10");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith({
      expectedVersion: 1,
      isActive: true,
      stampUnit: "item",
      goal: 9,
      rewardKind: "discount",
      rewardAmountCents: 1000,
      rewardText: null,
    }),
  );
  expect(await screen.findByText("Fidelidad guardada")).toBeOnTheScreen();
});

test("por compra la meta no pasa de 30, y al cambiar la unidad se acomoda a su rango", async () => {
  mockSettings.mockResolvedValue({ ...OFF, isActive: true, stampUnit: "item", goal: 60 });
  await renderWithProviders(<LoyaltyScreen onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("radio", { name: "Por compra" }));
  expect(screen.getByLabelText("Cantidad de sellos para el premio").props.value).toBe("30");
});

test("otro cambio que llegó antes lo dice; sin señal, no se guarda", async () => {
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  await renderWithProviders(<LoyaltyScreen onBack={jest.fn()} />);
  await fireEvent(await screen.findByLabelText("Fidelidad activa"), "valueChange", true);
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Otro cambio llegó antes: se cargó la fidelidad nueva.")).toBeOnTheScreen();
  await act(() => onlineManager.setOnline(false));
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
});

test("«Cerca del premio» con quienes les faltan 2 o menos", async () => {
  mockSettings.mockResolvedValue({ ...OFF, isActive: true });
  mockOverview.mockResolvedValue({
    goal: 10,
    customers: [
      { customerId: "c1", name: "Sofía L. (DEMO)", stamps: 10 },
      { customerId: "c2", name: "Ana Q. (DEMO)", stamps: 9 },
    ],
  });
  await renderWithProviders(<LoyaltyScreen onBack={jest.fn()} />);
  expect(await screen.findByText("Premio listo")).toBeOnTheScreen();
  expect(screen.getByText("Le falta 1")).toBeOnTheScreen();
  expect(screen.getByText("9/10")).toBeOnTheScreen();
});
