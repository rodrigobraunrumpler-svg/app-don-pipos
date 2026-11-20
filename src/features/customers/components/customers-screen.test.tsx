import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/render";

import type { CustomerRow } from "../schema/customer";
import { CustomersScreen } from "./customers-screen";

const mockSearch = jest.fn();
jest.mock("../api/customers", () => ({
  searchCustomers: (input: unknown) => mockSearch(input),
}));

const row = (overrides: Partial<CustomerRow>): CustomerRow => ({
  id: "c1",
  name: "Ana Q. (DEMO)",
  phone: "+51900000501",
  ordersCount: 7,
  spentCents: 25400,
  lastOrderAt: new Date().toISOString(),
  acceptsPromotions: true,
  ...overrides,
});
const page = (items: CustomerRow[]) => ({
  items,
  meta: { limit: 20, total: items.length, hasMore: false, nextCursor: null },
});
const ROWS = [
  row({}),
  row({ id: "c2", name: "Rosa T. (DEMO)", ordersCount: 3, spentCents: 7200, acceptsPromotions: true }),
  row({ id: "c3", name: "Martín C. (DEMO)", ordersCount: 1, spentCents: 2400, acceptsPromotions: false }),
];
const handlers = () => ({
  onBack: jest.fn(),
  onOpen: jest.fn(),
  lapsedAction: (customer: CustomerRow) => <Text>{`Escribirle a ${customer.name}`}</Text>,
});

beforeEach(() => mockSearch.mockReset().mockResolvedValue(page(ROWS)));
afterEach(() => onlineManager.setOnline(true));

test("todos, con cuántos son; cada fila con sus pedidos, el último y lo gastado, y tocarla abre la ficha", async () => {
  const on = handlers();
  await renderWithProviders(<CustomersScreen {...on} />);
  expect(await screen.findByText("3 clientes")).toBeOnTheScreen();
  expect(mockSearch).toHaveBeenLastCalledWith({ filter: "all", search: "", cursor: null });
  expect(screen.getByText(/^7 pedidos, último hoy, \d\d:\d\d$/)).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a0254.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: /^Ana Q\. \(DEMO\)/ }));
  expect(on.onOpen).toHaveBeenCalledWith("c1");
});

test("cada filtro pide lo suyo; los que más compran van numerados", async () => {
  await renderWithProviders(<CustomersScreen {...handlers()} />);
  await screen.findByText("3 clientes");
  await fireEvent.press(screen.getByRole("button", { name: "Los que más compran" }));
  await waitFor(() => expect(mockSearch).toHaveBeenLastCalledWith({ filter: "top", search: "", cursor: null }));
  expect(await screen.findByText("1. Ana Q. (DEMO)")).toBeOnTheScreen();
});

test("se busca al terminar de escribir, una sola vez", async () => {
  await renderWithProviders(<CustomersScreen {...handlers()} />);
  await screen.findByText("3 clientes");
  mockSearch.mockClear();
  await fireEvent.changeText(screen.getByLabelText("Buscar clientes"), "a");
  await fireEvent.changeText(screen.getByLabelText("Buscar clientes"), "an");
  await fireEvent.changeText(screen.getByLabelText("Buscar clientes"), "ana ");
  await waitFor(() => expect(mockSearch).toHaveBeenCalledWith({ filter: "all", search: "ana", cursor: null }));
  expect(mockSearch).toHaveBeenCalledTimes(1);
});

test("en «No vuelven», «Escribirle» solo a quien aceptó promociones, con la nota", async () => {
  await renderWithProviders(<CustomersScreen {...handlers()} />);
  await screen.findByText("3 clientes");
  await fireEvent.press(screen.getByRole("button", { name: "No vuelven" }));
  expect(await screen.findByText("Escribirle a Rosa T. (DEMO)")).toBeOnTheScreen();
  expect(screen.getByText("Sin permiso para promociones")).toBeOnTheScreen();
  expect(screen.getByText("Solo puedes escribirles una promoción a quienes aceptaron recibirlas.")).toBeOnTheScreen();
});

test("sin clientes, explica cómo llegan", async () => {
  mockSearch.mockResolvedValue(page([]));
  await renderWithProviders(<CustomersScreen {...handlers()} />);
  expect(await screen.findByText("Todavía no hay clientes")).toBeOnTheScreen();
  expect(screen.getByText("Se registran solos al anotar un pedido con su teléfono.")).toBeOnTheScreen();
});

test("sin señal, desde cuándo es la lista", async () => {
  await renderWithProviders(<CustomersScreen {...handlers()} />);
  await screen.findByText("3 clientes");
  await act(() => onlineManager.setOnline(false));
  expect(await screen.findByText(/^Sin conexión\. Ves los clientes de las \d\d:\d\d\.$/)).toBeOnTheScreen();
});

test("al cambiar de filtro no parpadea: la lista de antes queda hasta que llega la nueva", async () => {
  await renderWithProviders(<CustomersScreen {...handlers()} />);
  await screen.findByText("3 clientes");
  mockSearch.mockReturnValue(new Promise(() => undefined));
  await fireEvent.press(screen.getByRole("button", { name: "No vuelven" }));
  expect(screen.queryByLabelText("Cargando")).toBeNull();
  expect(screen.getByText("Ana Q. (DEMO)")).toBeOnTheScreen();
});
