// Corregir desde Un pedido: editar, anular, cambiar el medio de un pago y sus «Deshacer»
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";

import type { Order } from "../schema/order";
import { OrderDetail } from "./order-detail";

const mockGet = jest.fn();
const mockEdit = jest.fn();
const mockRevertEdit = jest.fn();
const mockCancel = jest.fn();
const mockRevertCancel = jest.fn();
const mockChange = jest.fn();
jest.mock("../api/orders", () => ({
  getOrder: () => mockGet(),
  editOrder: (input: unknown) => mockEdit(input),
  revertEdit: (input: unknown) => mockRevertEdit(input),
  cancelOrder: (input: unknown) => mockCancel(input),
  revertCancel: (input: unknown) => mockRevertCancel(input),
  changePaymentMethod: (input: unknown) => mockChange(input),
}));
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => (jest.requireActual("@/test/products") as { TEST_PRODUCTS: unknown }).TEST_PRODUCTS,
}));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 500, version: 1 },
  }),
}));
jest.mock("@/features/messages/api/templates", () => ({ listTemplates: async () => [] }));

const at = "2026-11-19T15:00:00.000Z";
const withStatus = (status: Order["status"], changes: Partial<Order> = {}): Order => ({
  ...TEST_ORDER,
  status,
  timeline: [...TEST_ORDER.timeline, ...(status === "new" ? [] : [{ status, at }])],
  ...changes,
});
const open = async (order: Order) => {
  mockGet.mockResolvedValue(order);
  return renderWithProviders(<OrderDetail orderId={order.id} onBack={jest.fn()} />);
};

beforeEach(() =>
  [mockGet, mockEdit, mockRevertEdit, mockCancel, mockRevertCancel, mockChange].forEach((mock) => mock.mockReset()),
);

test("editar y anular desde el pedido, con sus «Deshacer»", async () => {
  const edited = withStatus("new", { version: 2, totalCents: 5400 });
  mockEdit.mockResolvedValue(edited);
  mockRevertEdit.mockResolvedValue(withStatus("new", { version: 3 }));
  await open(withStatus("new"));
  await fireEvent.press(await screen.findByRole("button", { name: "Editar pedido" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(await screen.findByText("Pedido #0042 actualizado: S/ 54.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  await waitFor(() => expect(mockRevertEdit).toHaveBeenCalledWith({ orderId: TEST_ORDER.id, version: 2 }));
  expect(await screen.findByText("Pedido #0042: se deshizo el cambio.")).toBeOnTheScreen();

  mockCancel.mockResolvedValue(withStatus("cancelled", { cancelReason: "Sin stock", version: 4 }));
  mockRevertCancel.mockResolvedValue(withStatus("new", { version: 5 }));
  await fireEvent.press(screen.getByRole("button", { name: "Anular" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Sin stock" }));
  await fireEvent.press(screen.getByRole("button", { name: "Anular pedido" }));
  expect(await screen.findByText("Pedido #0042 anulado")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  await waitFor(() => expect(mockRevertCancel).toHaveBeenCalledWith(TEST_ORDER.id));
});

test("un pedido anulado dice su motivo y ya no ofrece acciones", async () => {
  await open(withStatus("cancelled", { cancelReason: "El cliente canceló" }));
  expect(
    await screen.findByText("Pedido anulado: el cliente canceló. Los alfajores volvieron al stock."),
  ).toBeOnTheScreen();
  for (const label of ["Editar pedido", "Anular", "Registrar pago de S/ 22.00"])
    expect(screen.queryByRole("button", { name: label })).toBeNull();
});

test("la devolución se lee como tal y el medio de un pago se corrige ahí mismo", async () => {
  const refund = { ...TEST_ORDER.payments[0]!, id: "00000000-0000-4000-8000-0000000000e2", kind: "refund" as const };
  const order = withStatus("cancelled", {
    cancelReason: "Sin stock",
    paidCents: 0,
    payments: [TEST_ORDER.payments[0]!, refund],
  });
  mockChange.mockResolvedValue(order);
  await open(order);
  expect(await screen.findByText("Devolución: Yape")).toBeOnTheScreen();
  expect(screen.getByText("−S/ 20.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getAllByRole("button", { name: "Cambiar medio" })[1]!);
  expect(await screen.findByText("Devolución de S/ 20.00 con Yape. Elige con qué fue de verdad.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Efectivo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar medio" }));
  expect(await screen.findByText("Medio cambiado: Efectivo")).toBeOnTheScreen();
  expect(mockChange).toHaveBeenCalledWith({ requestId: expect.any(String), paymentId: refund.id, method: "cash" });
});

test("tocar «Deshacer» lo quita del aviso: un segundo toque no manda otro deshacer", async () => {
  mockEdit.mockResolvedValue(withStatus("new", { version: 2, totalCents: 5400 }));
  let finish: (value: unknown) => void = () => undefined;
  mockRevertEdit.mockImplementationOnce(() => new Promise((done) => (finish = done)));
  await open(withStatus("new"));
  await fireEvent.press(await screen.findByRole("button", { name: "Editar pedido" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Deshacer" }));
  expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
  finish(withStatus("new", { version: 3 }));
  expect(await screen.findByText("Pedido #0042: se deshizo el cambio.")).toBeOnTheScreen();
  expect(mockRevertEdit).toHaveBeenCalledTimes(1);
});

test("si «Deshacer» falla sin señal, el aviso lo vuelve a ofrecer", async () => {
  mockCancel.mockResolvedValue(withStatus("cancelled", { cancelReason: "Sin stock", version: 2 }));
  mockRevertCancel
    .mockRejectedValueOnce(new AppError("offline"))
    .mockResolvedValueOnce(withStatus("new", { version: 3 }));
  await open(withStatus("new"));
  await fireEvent.press(await screen.findByRole("button", { name: "Anular" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Sin stock" }));
  await fireEvent.press(screen.getByRole("button", { name: "Anular pedido" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Deshacer" }));
  expect(await screen.findByText("Sin conexión. Revisa tu señal y vuelve a intentar.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  expect(await screen.findByText("Pedido #0042: se deshizo la anulación.")).toBeOnTheScreen();
  expect(mockRevertCancel).toHaveBeenCalledTimes(2);
});

test("un pedido anulado no dice que falta cobrar: dice con cuánto te quedaste", async () => {
  const refund = {
    ...TEST_ORDER.payments[0]!,
    id: "00000000-0000-4000-8000-0000000000e2",
    kind: "refund" as const,
    amountCents: 1000,
  };
  const kept = withStatus("cancelled", {
    cancelReason: "El cliente canceló",
    paidCents: 1000,
    payments: [TEST_ORDER.payments[0]!, refund],
  });
  const first = await open(kept);
  expect(await screen.findByText("Anulado: no se cobra. Te quedaste con S/ 10.00.")).toBeOnTheScreen();
  expect(screen.queryByText(/Falta cobrar/)).toBeNull();
  await first.unmount();

  await open(withStatus("cancelled", { cancelReason: "Sin stock", paidCents: 0, payments: [] }));
  expect(await screen.findByText("Anulado: no se cobra.")).toBeOnTheScreen();
  expect(screen.getByText("Sin pagos")).toBeOnTheScreen();
  expect(screen.queryByText("Se cobra al entregar")).toBeNull();
});
