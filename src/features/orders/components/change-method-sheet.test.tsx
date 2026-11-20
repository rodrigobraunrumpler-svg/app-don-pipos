import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";

import { ChangeMethodSheet } from "./change-method-sheet";

const mockChange = jest.fn();
jest.mock("../api/orders", () => ({ changePaymentMethod: (input: unknown) => mockChange(input) }));

const payment = TEST_ORDER.payments[0]!;

test("cambiar manda el pago y el medio con su código, el mismo en el reintento", async () => {
  mockChange.mockRejectedValueOnce(new AppError("offline")).mockResolvedValueOnce(TEST_ORDER);
  const onDone = jest.fn();
  await renderWithProviders(
    <ChangeMethodSheet
      order={TEST_ORDER}
      payment={payment}
      methods={["cash", "yape", "plin"]}
      onClose={jest.fn()}
      onDone={onDone}
    />,
  );
  expect(screen.getByText("Pago de S/ 20.00 con Yape. Elige con qué fue de verdad.")).toBeOnTheScreen();
  // El medio de ahora no se ofrece
  expect(screen.queryByRole("button", { name: "Yape" })).toBeNull();
  expect(screen.getByRole("button", { name: "Guardar medio" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Plin" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar medio" }));
  expect(await screen.findByText("Sin conexión. Revisa tu señal y vuelve a intentar.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar medio" }));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith("plin"));
  const [first, second] = mockChange.mock.calls.map(([input]) => input as { requestId: string });
  expect(first).toEqual({ requestId: expect.any(String), paymentId: payment.id, method: "plin" });
  expect(second!.requestId).toBe(first!.requestId);
});

test("si ese cambio ya se había guardado con otro medio, lo dice sin invitar a repetir", async () => {
  mockChange.mockReset();
  mockChange.mockRejectedValueOnce(new AppError("conflict"));
  await renderWithProviders(
    <ChangeMethodSheet
      order={TEST_ORDER}
      payment={payment}
      methods={["cash", "yape"]}
      onClose={jest.fn()}
      onDone={jest.fn()}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Efectivo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar medio" }));
  expect(
    await screen.findByText("Este pago ya se había cambiado antes. Cierra la hoja para ver cómo quedó."),
  ).toBeOnTheScreen();
});
