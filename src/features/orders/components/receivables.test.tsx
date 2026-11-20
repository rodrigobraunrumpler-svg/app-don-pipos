import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import { renderWithProviders } from "@/test/render";

import type { Receivable } from "../schema/order";
import { Receivables } from "./receivables";

const mockList = jest.fn();
jest.mock("../api/orders", () => ({ listReceivables: (input: unknown) => mockList(input) }));
jest.mock("@/features/messages/api/templates", () => ({
  listTemplates: async () => [
    {
      key: "balance_reminder",
      body: "Hola {nombre}, te recordamos el saldo de tu pedido {numero}: {falta}. Puedes pagar por Yape, Plin, transferencia o efectivo.",
      version: 1,
    },
  ],
}));

const item = (number: number, changes: Partial<Receivable>): Receivable => ({
  id: `id-${number}`,
  number,
  customerName: "Ana (DEMO)",
  customerPhone: "+51900000990",
  fulfillment: "delivery",
  status: "new",
  totalCents: 4200,
  paidCents: 0,
  dueDate: "2026-11-19",
  scheduledFor: null,
  remind: false,
  ...changes,
});
const page = (items: Receivable[], meta: object = {}) => ({
  items,
  meta: { limit: 20, total: items.length, hasMore: false, nextCursor: null, totalDueCents: 9200, ...meta },
});

beforeEach(() => mockList.mockReset());

test("cuánto te deben y por qué, con «Recordar» solo cuando corresponde", async () => {
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  mockList.mockResolvedValue(
    page([
      item(44, { status: "delivered", remind: true }),
      item(43, { customerName: "Luis (DEMO)", fulfillment: "pickup", totalCents: 2400 }),
      item(41, { customerName: "Rosa (DEMO)", customerPhone: null, paidCents: 1000, totalCents: 3600, remind: true }),
    ]),
  );
  const onOpen = jest.fn();
  await renderWithProviders(<Receivables onBack={jest.fn()} onOpen={onOpen} />);
  expect(await screen.findByText("S/ 92.00")).toBeOnTheScreen();
  expect(screen.getByText("3 pedidos")).toBeOnTheScreen();
  expect(screen.getByText("Entregado, quedó debiendo")).toBeOnTheScreen();
  expect(screen.getByText("Se cobra al recoger")).toBeOnTheScreen();
  expect(screen.getByText("Adelanto de S/ 10.00")).toBeOnTheScreen();
  expect(screen.getByText("S/ 26.00")).toBeOnTheScreen();
  expect(screen.getByText("Sin recordatorio todavía")).toBeOnTheScreen();
  expect(screen.getByText("Sin teléfono")).toBeOnTheScreen();
  expect(
    screen.getByText("El recordatorio solo aparece si ya entregaste o si recibiste un adelanto."),
  ).toBeOnTheScreen();

  await fireEvent.press(await screen.findByRole("button", { name: "Recordar a Ana" }));
  expect(openURL).toHaveBeenCalledWith(
    `https://wa.me/51900000990?text=${encodeURIComponent(
      "Hola Ana, te recordamos el saldo de tu pedido #0044: S/ 42.00. Puedes pagar por Yape, Plin, transferencia o efectivo.",
    )}`,
  );
  await fireEvent.press(screen.getByRole("button", { name: /^#0043/ }));
  expect(onOpen).toHaveBeenCalledWith("id-43");
});

test("llega de 20 en 20", async () => {
  const first = Array.from({ length: 20 }, (_, index) => item(30 - index, {}));
  mockList.mockImplementation(async ({ cursor }: { cursor: string | null }) =>
    cursor === null ? page(first, { total: 21, hasMore: true, nextCursor: "11" }) : page([item(5, {})], { total: 21 }),
  );
  await renderWithProviders(<Receivables onBack={jest.fn()} onOpen={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Cargar 1 más" }));
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ cursor: "11" }));
  expect(await screen.findByRole("button", { name: /^#0005/ })).toBeOnTheScreen();
});

test("sin saldos: nadie te debe", async () => {
  mockList.mockResolvedValue(page([], { totalDueCents: 0 }));
  await renderWithProviders(<Receivables onBack={jest.fn()} onOpen={jest.fn()} />);
  expect(await screen.findByText("Nadie te debe")).toBeOnTheScreen();
  expect(screen.getByText("Todo lo entregado está cobrado. Cuando quede un saldo, aparece aquí.")).toBeOnTheScreen();
});
