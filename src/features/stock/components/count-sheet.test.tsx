import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";
import { LIMON_ID } from "@/test/stock-items";

import { CountSheet } from "./count-sheet";

const mockCount = jest.fn();
jest.mock("../api/stock", () => ({
  getStockOverview: async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
  registerWaste: jest.fn(),
  registerStockCount: (input: unknown) => mockCount(input),
  revertStockChange: jest.fn(),
}));

test("con 11, contar 12 dice «+1» y guarda un ajuste", async () => {
  mockCount.mockResolvedValue({
    adjustments: 1,
    items: [{ productId: LIMON_ID, onHand: 12 }],
    backOnWeb: [],
    outOnWeb: [],
  });
  const onDone = jest.fn();
  await renderWithProviders(<CountSheet productIds={[LIMON_ID]} onClose={jest.fn()} onDone={onDone} />);
  expect(await screen.findByText("Deberías tener 11 en la nevera")).toBeOnTheScreen();
  expect(screen.getByText("Igual")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Sin diferencias" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Más Limon Kiss" }));
  expect(screen.getByText("+1")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar 1 ajuste" }));
  await waitFor(() =>
    expect(mockCount).toHaveBeenCalledWith({
      requestId: expect.any(String),
      counts: [{ productId: LIMON_ID, counted: 12 }],
    }),
  );
  await waitFor(() =>
    expect(onDone).toHaveBeenCalledWith({
      requestId: mockCount.mock.calls[0][0].requestId,
      message: "Conteo guardado: 1 ajuste.",
    }),
  );
});

test("si ese código ya se guardó con otros datos, lo dice y el siguiente intento usa otro código", async () => {
  mockCount
    .mockReset()
    .mockRejectedValueOnce(new AppError("conflict"))
    .mockResolvedValueOnce({ adjustments: 1, items: [], backOnWeb: [], outOnWeb: [] });
  await renderWithProviders(<CountSheet productIds={[LIMON_ID]} onClose={jest.fn()} onDone={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Más Limon Kiss" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar 1 ajuste" }));
  expect(
    await screen.findByText("Esto ya se había guardado con otros datos. Revisa el stock y vuelve a intentar."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar 1 ajuste" }));
  await waitFor(() => expect(mockCount).toHaveBeenCalledTimes(2));
  expect(mockCount.mock.calls[1][0].requestId).not.toBe(mockCount.mock.calls[0][0].requestId);
});
