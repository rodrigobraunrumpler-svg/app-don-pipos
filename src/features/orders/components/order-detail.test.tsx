import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";

import type { Order } from "../schema/order";
import { OrderDetail } from "./order-detail";

const mockGet = jest.fn();
const mockAdvance = jest.fn();
const mockRevert = jest.fn();
const mockPay = jest.fn();
const mockEdit = jest.fn();
const mockRevertEdit = jest.fn();
const mockCancel = jest.fn();
const mockRevertCancel = jest.fn();
const mockChange = jest.fn();
jest.mock("../api/orders", () => ({
  getOrder: () => mockGet(),
  advanceOrder: (input: unknown) => mockAdvance(input),
  revertStatus: (input: unknown) => mockRevert(input),
  addPayment: (input: unknown) => mockPay(input),
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
jest.mock("@/features/messages/api/templates", () => ({
  listTemplates: async () => [
    { key: "on_the_way", body: "Hola {nombre}, tu pedido {numero} va en camino. {pago}", version: 1 },
  ],
}));

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
  [
    mockGet,
    mockAdvance,
    mockRevert,
    mockPay,
    mockEdit,
    mockRevertEdit,
    mockCancel,
    mockRevertCancel,
    mockChange,
  ].forEach((mock) => mock.mockReset()),
);

test("la acción de abajo cambia según el estado y la entrega", async () => {
  const cases: [Order, string | null][] = [
    [withStatus("new"), "Empezar a preparar"],
    [withStatus("preparing"), "Marcar en camino"],
    [withStatus("preparing", { fulfillment: "pickup" }), "Marcar listo para recoger"],
    [withStatus("on_the_way"), "Marcar entregado"],
    [withStatus("delivered"), "Registrar pago de S/ 22.00"],
    [withStatus("delivered", { paidCents: 4200 }), null],
  ];
  for (const [order, action] of cases) {
    const { unmount } = await open(order);
    expect(await screen.findByText("Pedido #0042")).toBeOnTheScreen();
    for (const label of ["Empezar a preparar", "Marcar en camino", "Marcar listo para recoger", "Marcar entregado"])
      if (label !== action) expect(screen.queryByRole("button", { name: label })).toBeNull();
    if (action) expect(screen.getByRole("button", { name: action })).toBeEnabled();
    await unmount();
  }
});

test("avanzar se ve al instante y vuelve atrás si no se pudo guardar", async () => {
  let reject: (error: unknown) => void = () => undefined;
  mockAdvance.mockImplementationOnce(() => new Promise((_resolve, fail) => (reject = fail)));
  await open(withStatus("new"));
  await fireEvent.press(await screen.findByRole("button", { name: "Empezar a preparar" }));
  expect(await screen.findByRole("button", { name: "Marcar en camino" })).toBeOnTheScreen();
  expect(mockAdvance).toHaveBeenCalledWith({ orderId: TEST_ORDER.id, fromStatus: "new" });
  reject(new AppError("offline"));
  expect(
    await screen.findByText("No se pudo guardar: el pedido volvió a «Nuevo». Revisa la señal y vuelve a intentar."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Empezar a preparar" })).toBeOnTheScreen();
});

test("«Deshacer» llama a revert_status con el estado que se deshace", async () => {
  mockAdvance.mockResolvedValue(withStatus("preparing"));
  mockRevert.mockResolvedValue(withStatus("new"));
  await open(withStatus("new"));
  await fireEvent.press(await screen.findByRole("button", { name: "Empezar a preparar" }));
  expect(await screen.findByText("#0042: preparando")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  await waitFor(() => expect(mockRevert).toHaveBeenCalledWith({ orderId: TEST_ORDER.id, expectedStatus: "preparing" }));
  expect(await screen.findByText("#0042: volvió a «Nuevo».")).toBeOnTheScreen();
});

test("el pago no deja pasar lo que falta", async () => {
  mockPay.mockResolvedValue(withStatus("delivered", { paidCents: 4200 }));
  await open(withStatus("delivered"));
  await fireEvent.press(await screen.findByRole("button", { name: "Registrar pago de S/ 22.00" }));
  expect(await screen.findByText("Falta cobrar S/ 22.00 del pedido #0042.")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Monto del pago en soles"), "30");
  await fireEvent.press(screen.getByRole("button", { name: "Yape" }));
  expect(screen.getByText("No puede pasar de lo que falta: S/ 22.00.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar pago" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Monto del pago en soles"), "22");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pago" }));
  await waitFor(() =>
    expect(mockPay).toHaveBeenCalledWith({
      requestId: expect.any(String),
      orderId: TEST_ORDER.id,
      method: "yape",
      amountCents: 2200,
    }),
  );
  expect(await screen.findByText("Pago guardado: S/ 22.00 con Yape")).toBeOnTheScreen();
});

test("el mensaje de «en camino» se llena con lo que falta pagar", async () => {
  await open(withStatus("on_the_way"));
  expect(await screen.findByText("Avisar «en camino» a Ana")).toBeOnTheScreen();
  expect(
    await screen.findByText("Hola Ana, tu pedido #0042 va en camino. Total a pagar: S/ 22.00 (Yape o efectivo)."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enviar por WhatsApp" })).toBeOnTheScreen();
});

test("un doble toque en la acción avanza un solo paso", async () => {
  let resolve: (order: unknown) => void = () => undefined;
  mockAdvance.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
  mockAdvance.mockResolvedValue(withStatus("on_the_way"));
  await open(withStatus("new"));
  await fireEvent.press(await screen.findByRole("button", { name: "Empezar a preparar" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Marcar en camino" }));
  expect(screen.getByRole("button", { name: "Marcar en camino" })).toBeDisabled();
  // La base ya quedó en «Preparando»: es lo que devuelve al volver a leer el pedido
  mockGet.mockResolvedValue(withStatus("preparing"));
  resolve(withStatus("preparing"));
  // Mientras se guarda, la acción está apagada; vuelve cuando la base responde
  await waitFor(() => expect(screen.getByRole("button", { name: "Marcar en camino" })).toBeEnabled());
  await new Promise((wait) => setTimeout(wait, 50));
  expect(mockAdvance).toHaveBeenCalledTimes(1);
});

test("si ese pago ya se había guardado con otro monto, lo dice sin invitar a registrarlo otra vez", async () => {
  mockPay.mockRejectedValueOnce(new AppError("conflict"));
  await open(withStatus("delivered"));
  await fireEvent.press(await screen.findByRole("button", { name: "Registrar pago de S/ 22.00" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Yape" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pago" }));
  expect(
    await screen.findByText(
      "Este pago ya se había guardado antes de tu cambio. Revisa los pagos del pedido antes de registrarlo otra vez.",
    ),
  ).toBeOnTheScreen();
});

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
