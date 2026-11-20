import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { businessDate, previousDay } from "@/lib/dates";
import { renderWithProviders } from "@/test/render";

import { IncomeForm } from "./income-form";

const mockCreate = jest.fn();
jest.mock("../api/income", () => ({ createManualIncome: (input: unknown) => mockCreate(input) }));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 0, version: 1 },
  }),
}));

test("uno de ayer: manda el código, en qué, el monto, el medio y el día; queda listo para el siguiente", async () => {
  mockCreate.mockResolvedValue({
    id: "m1",
    description: "Evento (DEMO)",
    amountCents: 7000,
    method: "yape",
    receivedAt: "",
    voidedAt: null,
  });
  await renderWithProviders(<IncomeForm onBack={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Guardar ingreso" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Monto del ingreso en soles"), "70");
  await fireEvent.changeText(screen.getByLabelText("En qué entró"), " Evento (DEMO) ");
  await fireEvent.press(await screen.findByRole("button", { name: "Yape" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ayer" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar ingreso de S/ 70.00" }));
  await waitFor(() =>
    expect(mockCreate).toHaveBeenCalledWith({
      requestId: expect.any(String),
      description: "Evento (DEMO)",
      amountCents: 7000,
      method: "yape",
      receivedOn: previousDay(businessDate(new Date())),
    }),
  );
  expect(await screen.findByText("Ingreso guardado: S/ 70.00")).toBeOnTheScreen();
  expect(screen.getByLabelText("Monto del ingreso en soles")).toHaveDisplayValue("");
  expect(screen.getByLabelText("En qué entró")).toHaveDisplayValue("");
});
