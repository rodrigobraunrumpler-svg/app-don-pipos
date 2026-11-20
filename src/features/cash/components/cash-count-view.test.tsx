import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { businessDate } from "@/lib/dates";
import { renderWithProviders } from "@/test/render";

import { CashCountView } from "./cash-count-view";

const mockLatest = jest.fn();
const mockClose = jest.fn();
jest.mock("../api/cash", () => ({
  getCashExpected: async (date: string) => ({
    businessDate: date,
    cashInCents: 6300,
    cashOutCents: 6900,
    otherMethods: { yape: 2400, plin: 0, transfer: 1000 },
    lastOpeningCents: 5000,
  }),
  getLatestCashCount: () => mockLatest(),
  closeCashDay: (input: unknown) => mockClose(input),
}));

const count = (changes: object = {}) => ({
  id: "k1",
  businessDate: businessDate(new Date()),
  openingCents: 5000,
  cashInCents: 6300,
  cashOutCents: 6900,
  expectedCents: 4400,
  countedCents: 4200,
  differenceCents: -200,
  closedAt: new Date().toISOString(),
  ...changes,
});

beforeEach(() => {
  mockLatest.mockReset().mockResolvedValue(null);
  mockClose.mockReset().mockResolvedValue(count());
});

test("lo que debería haber y el resultado mientras se cuenta; cerrar el día guarda el conteo", async () => {
  await renderWithProviders(<CashCountView onBack={jest.fn()} />);
  expect(await screen.findByLabelText("Con cuánto abriste la caja, en soles")).toHaveDisplayValue("50.00");
  expect(screen.getByText("+ S/ 63.00")).toBeOnTheScreen();
  expect(screen.getByText("− S/ 69.00")).toBeOnTheScreen();
  expect(screen.getByText("S/ 44.00")).toBeOnTheScreen();
  expect(screen.getByText("Yape")).toBeOnTheScreen();
  expect(screen.getByText("Transferencia")).toBeOnTheScreen();
  expect(screen.queryByText("Plin")).toBeNull();
  expect(screen.getByText("Compáralos con lo que muestran sus apps.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Cerrar el día" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Cuánto hay en la caja, en soles"), "42");
  expect(screen.getByText("Faltan S/ 2.00.")).toBeOnTheScreen();
  expect(screen.getByText("Revisa si falta anotar un gasto o un vuelto.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar el día" }));
  await waitFor(() =>
    expect(mockClose).toHaveBeenCalledWith({
      requestId: expect.any(String),
      businessDate: businessDate(new Date()),
      openingCents: 5000,
      countedCents: 4200,
    }),
  );
  expect(await screen.findByText("Día cerrado")).toBeOnTheScreen();
  expect(screen.getByText("Faltaron S/ 2.00. Quedó anotado.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Volver a contar" }));
  expect(screen.getByLabelText("Cuánto hay en la caja, en soles")).toBeOnTheScreen();
});

test("un día ya cerrado muestra cómo quedó", async () => {
  mockLatest.mockResolvedValue(count({ countedCents: 4400, differenceCents: 0 }));
  await renderWithProviders(<CashCountView onBack={jest.fn()} />);
  expect(await screen.findByText("Día cerrado")).toBeOnTheScreen();
  expect(screen.getByText("La caja cuadró: S/ 44.00 en efectivo.")).toBeOnTheScreen();
});
