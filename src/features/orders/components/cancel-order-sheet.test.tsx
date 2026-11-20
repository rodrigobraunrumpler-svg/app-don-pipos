import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";

import { CancelOrderSheet } from "./cancel-order-sheet";

const mockCancel = jest.fn();
jest.mock("../api/orders", () => ({ cancelOrder: (input: unknown) => mockCancel(input) }));

beforeEach(() => mockCancel.mockReset());

const open = (onDone = jest.fn()) =>
  renderWithProviders(<CancelOrderSheet order={TEST_ORDER} methods={["cash", "yape"]} onClose={jest.fn()} onDone={onDone} />);

test("sin motivo no se anula; con pagos, la devolución viene con todo lo pagado y su medio", async () => {
  const cancelled = { ...TEST_ORDER, status: "cancelled" as const, cancelReason: "Sin stock", version: 2 };
  mockCancel.mockResolvedValue(cancelled);
  const onDone = jest.fn();
  await open(onDone);
  expect(screen.getByText("Anular el pedido #0042")).toBeOnTheScreen();
  expect(
    screen.getByText("Los alfajores vuelven al stock. El pedido no se borra: queda como anulado, con su motivo."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Anular pedido" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Sin stock" }));
  expect(screen.getByText("¿Devolviste el dinero?")).toBeOnTheScreen();
  expect(screen.getByLabelText("Monto devuelto en soles")).toHaveDisplayValue("20.00");
  await fireEvent.press(screen.getByRole("button", { name: "Anular pedido" }));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith(cancelled));
  expect(mockCancel).toHaveBeenCalledWith({
    requestId: expect.any(String),
    orderId: TEST_ORDER.id,
    reason: "Sin stock",
    refund: { cents: 2000, method: "yape" },
  });
});

test("se puede devolver una parte, o nada", async () => {
  mockCancel.mockResolvedValue(TEST_ORDER);
  await open();
  await fireEvent.press(screen.getByRole("button", { name: "Error al anotar" }));
  await fireEvent.changeText(screen.getByLabelText("Monto devuelto en soles"), "0");
  await fireEvent.press(screen.getByRole("button", { name: "Anular pedido" }));
  await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(expect.objectContaining({ refund: null })));
});

test("no deja devolver más de lo pagado", async () => {
  await open();
  await fireEvent.press(screen.getByRole("button", { name: "El cliente canceló" }));
  await fireEvent.changeText(screen.getByLabelText("Monto devuelto en soles"), "25");
  expect(screen.getByText("No puede pasar de lo pagado: S/ 20.00.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Anular pedido" })).toBeDisabled();
});
