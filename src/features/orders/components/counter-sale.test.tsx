import { onlineManager } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";
import { COQUETA_ID } from "@/test/stock-items";

import { CounterSale } from "./counter-sale";

const mockSale = jest.fn();
jest.mock("../api/orders", () => ({ createCounterSale: (input: unknown) => mockSale(input) }));
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => (jest.requireActual("@/test/products") as { TEST_PRODUCTS: unknown }).TEST_PRODUCTS,
}));
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
}));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 500, version: 1 },
  }),
}));

afterEach(() => onlineManager.setOnline(true));

test("cobra con el medio tocado, manda solo los alfajores con más de 0 y queda vacía para la siguiente", async () => {
  mockSale.mockResolvedValue({
    ...TEST_ORDER,
    number: 43,
    fulfillment: "counter",
    status: "delivered",
    totalCents: 2400,
    paidCents: 2400,
    customer: null,
    customerName: null,
  });
  await renderWithProviders(<CounterSale onBack={jest.fn()} />);
  expect(await screen.findByText("Toca un alfajor para sumarlo")).toBeOnTheScreen();
  expect(await screen.findByRole("button", { name: "Efectivo" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Sumar un Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Más Limon Kiss" }));
  await fireEvent.press(screen.getByRole("button", { name: "Menos Limon Kiss" }));
  expect(screen.getByText("Quedan 10")).toBeOnTheScreen();
  expect(screen.getByText("3 alfajores")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Yape" }));
  await waitFor(() =>
    expect(mockSale).toHaveBeenCalledWith({
      requestId: expect.any(String),
      items: [{ productId: COQUETA_ID, quantity: 3 }],
      method: "yape",
    }),
  );
  expect(await screen.findByText("Venta guardada: #0043, S/ 24.00.")).toBeOnTheScreen();
  expect(screen.getByText("Toca un alfajor para sumarlo")).toBeOnTheScreen();
});

test("sin señal, cobrar se apaga y lo dice", async () => {
  await renderWithProviders(<CounterSale onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Sumar un Coqueta" }));
  onlineManager.setOnline(false);
  expect(await screen.findByText("Sin conexión. Para cobrar, espera la señal.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Efectivo" })).toBeDisabled();
});
