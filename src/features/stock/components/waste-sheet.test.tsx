import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";
import { COQUETA_ID, TEST_ITEMS } from "@/test/stock-items";

import { WasteSheet } from "./waste-sheet";

const mockWaste = jest.fn();
jest.mock("../api/stock", () => ({
  getStockOverview: async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
  registerWaste: (input: unknown) => mockWaste(input),
  registerStockCount: jest.fn(),
  revertStockChange: jest.fn(),
}));

beforeEach(() => mockWaste.mockReset());

async function open(onDone = jest.fn()) {
  const result = await renderWithProviders(<WasteSheet productId={null} onClose={jest.fn()} onDone={onDone} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Coqueta" }));
  return result;
}

test("sin motivo no se guarda; con Coqueta, 2 y «Rota», sí", async () => {
  mockWaste.mockResolvedValue({ productId: COQUETA_ID, onHand: 11, outOnWeb: false });
  const onDone = jest.fn();
  await open(onDone);
  await fireEvent.press(screen.getByRole("button", { name: "Más Coqueta" }));
  expect(screen.getByRole("button", { name: "Guardar merma" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Rota" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar merma" }));
  await waitFor(() =>
    expect(mockWaste).toHaveBeenCalledWith({
      requestId: expect.any(String),
      productId: COQUETA_ID,
      quantity: 2,
      reason: "broken",
    }),
  );
  await waitFor(() =>
    expect(onDone).toHaveBeenCalledWith({
      requestId: mockWaste.mock.calls[0][0].requestId,
      message: "Merma anotada: 2 Coqueta.",
    }),
  );
});

test("el stock baja al instante y vuelve si falla; el reintento manda el mismo código", async () => {
  let reject: (error: unknown) => void = () => undefined;
  mockWaste.mockImplementationOnce(() => new Promise((_resolve, fail) => (reject = fail)));
  const { queryClient } = await open();
  await fireEvent.press(screen.getByRole("button", { name: "Vencida" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar merma" }));
  await waitFor(() => expect(queryClient.getQueryData<typeof TEST_ITEMS>(["stock", "overview"])?.[0]?.onHand).toBe(12));
  reject(new AppError("offline"));
  expect(await screen.findByText("Sin conexión. Revisa tu señal y vuelve a intentar.")).toBeOnTheScreen();
  expect(queryClient.getQueryData<typeof TEST_ITEMS>(["stock", "overview"])?.[0]?.onHand).toBe(13);

  mockWaste.mockResolvedValueOnce({ productId: COQUETA_ID, onHand: 12, outOnWeb: false });
  await fireEvent.press(screen.getByRole("button", { name: "Guardar merma" }));
  await waitFor(() => expect(mockWaste).toHaveBeenCalledTimes(2));
  expect(mockWaste.mock.calls[1][0].requestId).toBe(mockWaste.mock.calls[0][0].requestId);
});
