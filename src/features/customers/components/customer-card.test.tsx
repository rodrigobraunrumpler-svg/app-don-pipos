import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Linking, Text } from "react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import type { Customer } from "../schema/customer";
import { CustomerCard } from "./customer-card";

const mockUpdate = jest.fn();
const mockErase = jest.fn();
jest.mock("../api/customers", () => ({
  updateCustomer: (input: unknown) => mockUpdate(input),
  anonymizeCustomer: (id: string) => mockErase(id),
}));

const LUCIA: Customer = {
  id: "c1",
  name: "Lucía R. (DEMO)",
  phone: "+51900000128",
  ordersCount: 9,
  spentCents: 38600,
  lastOrderAt: new Date().toISOString(),
  acceptsPromotions: true,
  address: "Jr. Callao 318 (DEMO)",
  note: "Prefiere que le escriban antes de salir.",
  stamps: 7,
  favorite: { productId: "p2", name: "Morenita" },
  anonymizedAt: null,
  version: 4,
};
const props = (customer: Customer = LUCIA) => ({
  customer,
  stamps: <Text>tarjeta de sellos</Text>,
  orders: <Text>sus pedidos</Text>,
});

beforeEach(() => {
  mockUpdate
    .mockReset()
    .mockImplementation(async (input: Record<string, unknown>) => ({ ...LUCIA, ...input, version: 5 }));
  mockErase.mockReset().mockResolvedValue({
    ...LUCIA,
    name: "Cliente eliminado",
    phone: null,
    address: null,
    note: null,
    acceptsPromotions: false,
    anonymizedAt: new Date().toISOString(),
    version: 5,
  });
});
afterEach(() => onlineManager.setOnline(true));

test("la ficha: WhatsApp y Llamar, sus números, su tarjeta, su favorito, su dirección, su nota y sus pedidos", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await renderWithProviders(<CustomerCard {...props()} />);
  expect(screen.getByText("9")).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a0386")).toBeOnTheScreen();
  expect(screen.getByText("Hoy")).toBeOnTheScreen();
  expect(screen.getByText("tarjeta de sellos")).toBeOnTheScreen();
  expect(screen.getByText("Su favorito: Morenita. Dirección: Jr. Callao 318 (DEMO).")).toBeOnTheScreen();
  expect(screen.getByText("Prefiere que le escriban antes de salir.")).toBeOnTheScreen();
  expect(screen.getByText("sus pedidos")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "WhatsApp" }));
  expect(open).toHaveBeenLastCalledWith("https://wa.me/51900000128");
  await fireEvent.press(screen.getByRole("button", { name: "Llamar" }));
  expect(open).toHaveBeenLastCalledWith("tel:+51900000128");
  open.mockRestore();
});

test("cambiar el permiso de promociones manda la ficha con su versión", async () => {
  await renderWithProviders(<CustomerCard {...props()} />);
  await fireEvent(screen.getByLabelText("Acepta recibir promociones"), "valueChange", false);
  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith({
      id: "c1",
      expectedVersion: 4,
      name: "Lucía R. (DEMO)",
      address: "Jr. Callao 318 (DEMO)",
      note: "Prefiere que le escriban antes de salir.",
      acceptsPromotions: false,
    }),
  );
});

test("corregir sus datos; si otro cambio llegó antes, lo dice", async () => {
  await renderWithProviders(<CustomerCard {...props()} />);
  await fireEvent.press(screen.getByRole("button", { name: "Corregir datos" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lucía Ramos (DEMO)");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "Lucía Ramos (DEMO)" })));
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  await fireEvent.press(screen.getByRole("button", { name: "Corregir datos" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Otro cambio llegó antes: se cargaron sus datos nuevos.")).toBeOnTheScreen();
});

test("borrar sus datos pide confirmar", async () => {
  await renderWithProviders(<CustomerCard {...props()} />);
  await fireEvent.press(screen.getByRole("button", { name: "Borrar datos de este cliente" }));
  expect(screen.getByText(/No se puede deshacer\.$/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Borrar sus datos" }));
  await waitFor(() => expect(mockErase).toHaveBeenCalledWith("c1"));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Borrar sus datos" })).toBeNull());
});

test("un cliente borrado se ve sin datos ni acciones", async () => {
  await renderWithProviders(
    <CustomerCard
      {...props({
        ...LUCIA,
        name: "Cliente eliminado",
        phone: null,
        address: null,
        note: null,
        anonymizedAt: "2026-11-18T15:00:00.000Z",
      })}
    />,
  );
  expect(screen.getByText(/^Datos borrados a pedido del cliente\./)).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "WhatsApp" })).toBeNull();
  expect(screen.getByText("contacto")).toBeOnTheScreen();
});

test("sin señal, lo que cambia algo se apaga", async () => {
  await renderWithProviders(<CustomerCard {...props()} />);
  await act(() => onlineManager.setOnline(false));
  expect(screen.getByRole("button", { name: "Corregir datos" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Borrar datos de este cliente" })).toBeDisabled();
});
