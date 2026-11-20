import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";

import { businessDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";
import { COQUETA_ID } from "@/test/stock-items";

import { emptyDraft } from "../hooks/use-order-draft";
import type { DraftState } from "../schema/draft";
import { DraftDetails } from "./draft-details";

const mockCreate = jest.fn();
jest.mock("../api/orders", () => ({ createOrder: (input: unknown) => mockCreate(input) }));
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
const mockMatch = jest.fn();
const mockLoyalty = jest.fn();
jest.mock("@/features/customers/api/customers", () => ({ findCustomerByPhone: (phone: string) => mockMatch(phone) }));
jest.mock("@/features/loyalty/api/loyalty", () => ({ getLoyaltySettings: () => mockLoyalty() }));
const LOYALTY = {
  isActive: true,
  stampUnit: "order",
  goal: 10,
  rewardKind: "free_item",
  rewardAmountCents: null,
  rewardText: null,
  version: 2,
};
const SOFIA = {
  id: "c7",
  name: "Sofía L. (DEMO)",
  address: null,
  ordersCount: 10,
  lastOrderAt: null,
  stamps: 10,
  lastOrder: null,
};

beforeEach(() => {
  mockCreate.mockReset();
  mockMatch.mockReset().mockResolvedValue(null);
  mockLoyalty.mockReset().mockResolvedValue({ ...LOYALTY, isActive: false });
});

function Details({ onSaved = jest.fn() }: { onSaved?: jest.Mock }) {
  const [draft, setDraft] = useState<DraftState>({ ...emptyDraft(), quantities: { [COQUETA_ID]: 2 } });
  return (
    <DraftDetails
      draft={draft}
      onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      onBack={jest.fn()}
      onSaved={onSaved}
    />
  );
}

async function customer() {
  await fireEvent.changeText(await screen.findByLabelText("Teléfono del cliente"), "900000990");
  await fireEvent.changeText(await screen.findByLabelText("Nombre del cliente"), "Ana (DEMO)");
}

test("delivery sin dirección no se guarda; con dirección guarda el borrador entero con su código", async () => {
  mockCreate.mockResolvedValue(TEST_ORDER);
  const onSaved = jest.fn();
  await renderWithProviders(<Details onSaved={onSaved} />);
  await customer();
  await fireEvent.press(screen.getByRole("radio", { name: "Delivery" }));
  const save = await screen.findByRole("button", { name: "Guardar pedido de S/ 29.00" });
  expect(save).toBeDisabled();
  expect(screen.getByText("Escribe la dirección de entrega.")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Dirección de entrega"), "Jr. Lima 123");
  await fireEvent.press(screen.getByRole("radio", { name: "Una parte" }));
  await fireEvent.changeText(screen.getByLabelText("Monto del adelanto en soles"), "20");
  await fireEvent.press(screen.getByRole("button", { name: "Yape" }));
  expect(screen.getByText("Adelanto de S/ 20.00 con Yape. Falta S/ 9.00.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pedido de S/ 29.00" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(TEST_ORDER));
  expect(mockCreate).toHaveBeenCalledWith({
    requestId: expect.any(String),
    draft: {
      customer: { phone: "+51900000990", name: "Ana (DEMO)" },
      fulfillment: "delivery",
      deliveryAddress: "Jr. Lima 123",
      payment: { method: "yape", amountCents: 2000 },
      lines: [{ productId: COQUETA_ID, quantity: 2 }],
    },
  });
});

test("el adelanto no pasa del total", async () => {
  await renderWithProviders(<Details />);
  await customer();
  await fireEvent.press(screen.getByRole("radio", { name: "Una parte" }));
  await fireEvent.press(screen.getByRole("button", { name: "Yape" }));
  await fireEvent.changeText(screen.getByLabelText("Monto del adelanto en soles"), "30");
  expect(screen.getByText("El adelanto no puede pasar del total.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar pedido de S/ 24.00" })).toBeDisabled();
});

test("con un conflicto lo explica, y el siguiente intento usa otro código", async () => {
  mockCreate.mockRejectedValueOnce(new AppError("conflict")).mockResolvedValueOnce(TEST_ORDER);
  const onSaved = jest.fn();
  await renderWithProviders(<Details onSaved={onSaved} />);
  await customer();
  await fireEvent.press(await screen.findByRole("button", { name: "Guardar pedido de S/ 24.00" }));
  expect(
    await screen.findByText(
      "Este pedido ya se había guardado antes de tu último cambio. Revisa Pedidos y, si no está, vuelve a guardar.",
    ),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pedido de S/ 24.00" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(mockCreate.mock.calls[1][0].requestId).not.toBe(mockCreate.mock.calls[0][0].requestId);
});

test("una fecha más allá de la semana se escribe como día/mes", async () => {
  mockCreate.mockResolvedValue(TEST_ORDER);
  const target = businessDate(new Date(Date.now() + 20 * 86_400_000));
  await renderWithProviders(<Details />);
  await customer();
  await fireEvent.changeText(
    screen.getByLabelText("Otra fecha"),
    `${Number(target.slice(8))}/${Number(target.slice(5, 7))}`,
  );
  expect(screen.getByText("Aparece en «Próximos» hasta ese día.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar pedido de S/ 24.00" }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].draft.scheduledFor).toBe(target);
});

test("con su premio listo, «Aplicar» descuenta el alfajor más barato y el pedido lo pide; «Quitar» lo saca", async () => {
  mockLoyalty.mockResolvedValue(LOYALTY);
  mockMatch.mockResolvedValue(SOFIA);
  mockCreate.mockResolvedValue(TEST_ORDER);
  await renderWithProviders(<Details />);
  await fireEvent.changeText(await screen.findByLabelText("Teléfono del cliente"), "987654321");
  expect(await screen.findByText("Sofía tiene su premio listo")).toBeOnTheScreen();
  expect(screen.getByText("1 alfajor gratis, por completar su tarjeta de sellos")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Aplicar" }));
  expect(screen.getByText("Premio aplicado: −S/\u00a012.00")).toBeOnTheScreen();
  expect(screen.getByText("Premio de fidelidad")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Quitar" }));
  expect(await screen.findByRole("button", { name: "Guardar pedido de S/\u00a024.00" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Aplicar" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Guardar pedido de S/\u00a012.00" }));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  const sent = mockCreate.mock.calls[0]![0] as { draft: Record<string, unknown> };
  expect(sent.draft.redeemReward).toBe(true);
  expect(sent.draft).not.toHaveProperty("discountCents");
});

test("sin sellos suficientes o con la fidelidad apagada, no aparece el premio", async () => {
  mockLoyalty.mockResolvedValue(LOYALTY);
  mockMatch.mockResolvedValue({ ...SOFIA, stamps: 9 });
  await renderWithProviders(<Details />);
  await fireEvent.changeText(await screen.findByLabelText("Teléfono del cliente"), "987654321");
  await screen.findByText("Sofía L. (DEMO)");
  expect(screen.queryByText("Sofía tiene su premio listo")).toBeNull();
});

test("el descuento a mano no ofrece «Fidelidad»: el premio solo se aplica con su tarjeta de sellos", async () => {
  await renderWithProviders(<Details />);
  await fireEvent.press(await screen.findByRole("button", { name: "Agregar descuento" }));
  expect(screen.getByRole("button", { name: "Cliente frecuente" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Fidelidad" })).toBeNull();
});
