import { onlineManager } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";
import { COQUETA_ID, LIMON_ID } from "@/test/stock-items";

import { ProductionForm } from "./production-form";

const mockProduction = jest.fn();
const mockRevert = jest.fn();
jest.mock("../api/stock", () => ({
  getStockOverview: async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
  registerProduction: (input: unknown) => mockProduction(input),
  revertStockChange: (requestId: string) => mockRevert(requestId),
  registerWaste: jest.fn(),
  registerStockCount: jest.fn(),
}));

beforeEach(() => {
  mockProduction.mockReset();
  mockRevert.mockReset();
});
afterEach(() => onlineManager.setOnline(true));

// Espera a que la lista haya cargado antes de tocar
async function press(name: string, times: number) {
  for (let count = 0; count < times; count += 1) await fireEvent.press(await screen.findByRole("button", { name }));
}

test("3 Coqueta y 2 Limon Kiss: guarda solo esos dos y dice qué vuelve a la web", async () => {
  mockProduction.mockResolvedValue({
    total: 5,
    items: [],
    backOnWeb: [{ productId: COQUETA_ID, name: "Coqueta" }],
  });
  await renderWithProviders(<ProductionForm onBack={jest.fn()} onSeeStock={jest.fn()} />);
  expect(
    await screen.findByText(
      "Todavía no hay ventas suficientes para sugerir. Anota lo que hiciste y desde la próxima semana la app sugiere sola.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getAllByText("Anota cuántos hiciste")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Guardar producción" })).toBeDisabled();
  await press("Más Coqueta", 3);
  await press("Más Limon Kiss", 2);
  await fireEvent.press(screen.getByRole("button", { name: "Guardar producción: 5 alfajores" }));
  await waitFor(() =>
    expect(mockProduction).toHaveBeenCalledWith({
      requestId: expect.any(String),
      items: [
        { productId: COQUETA_ID, quantity: 3 },
        { productId: LIMON_ID, quantity: 2 },
      ],
    }),
  );
  expect(await screen.findByText("Producción guardada")).toBeOnTheScreen();
  expect(
    screen.getByText("Sumaste 5 alfajores y el stock ya está al día. Coqueta vuelve a aparecer disponible en la web."),
  ).toBeOnTheScreen();
});

test("«Deshacer» deshace esa producción y vuelve al formulario vacío", async () => {
  mockProduction.mockResolvedValue({ total: 1, items: [], backOnWeb: [] });
  mockRevert.mockResolvedValue({ reverted: 1, items: [] });
  await renderWithProviders(<ProductionForm onBack={jest.fn()} onSeeStock={jest.fn()} />);
  await press("Más Coqueta", 1);
  await fireEvent.press(await screen.findByRole("button", { name: "Guardar producción: 1 alfajor" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Deshacer" }));
  await waitFor(() => expect(mockRevert).toHaveBeenCalledWith(mockProduction.mock.calls[0][0].requestId));
  expect(await screen.findByText("Producción deshecha.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar producción" })).toBeDisabled();
});

test("sin señal no se puede guardar", async () => {
  await renderWithProviders(<ProductionForm onBack={jest.fn()} onSeeStock={jest.fn()} />);
  await press("Más Coqueta", 2);
  onlineManager.setOnline(false);
  expect(await screen.findByText("Sin conexión. Para registrar, espera la señal.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar producción: 2 alfajores" })).toBeDisabled();
});
