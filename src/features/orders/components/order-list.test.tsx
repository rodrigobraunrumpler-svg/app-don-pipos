import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";

import { businessDate } from "@/lib/dates";
import { TEST_ORDER, summaryOf } from "@/test/orders";
import { renderWithProviders } from "@/test/render";

import { OrderList } from "./order-list";

const mockList = jest.fn();
const COUNTS = { today: 2, toDeliver: 1, upcoming: 0, toCollect: 1, all: 25 };
const mockCounts = jest.fn(async () => COUNTS);
jest.mock("../api/orders", () => ({
  listOrders: (input: unknown) => mockList(input),
  getOrderCounts: () => mockCounts(),
  getOrder: jest.fn(),
}));

const today = businessDate(new Date());
const row = (number: number, changes: object = {}) => ({
  ...summaryOf(TEST_ORDER),
  id: `id-${number}`,
  number,
  dueDate: today,
  ...changes,
});
const page = (items: object[], meta: object = {}) => ({
  items,
  meta: { limit: 20, total: items.length, hasMore: false, nextCursor: null, ...meta },
});

beforeEach(() => {
  mockList.mockReset();
  mockList.mockImplementation(async () => page([row(44, { status: "preparing" }), row(43, { status: "delivered" })]));
});

test("«Hoy» agrupa lo que está en curso arriba y lo terminado abajo", async () => {
  await renderWithProviders(<OrderList onOpen={jest.fn()} onNew={jest.fn()} />);
  await screen.findByText("#0044");
  const order = screen.getAllByText(/^(En curso|Terminados|#00\d\d)$/).map((node) => node.props.children);
  expect(order).toEqual(["En curso", "#0044", "Terminados", "#0043"]);
  expect(mockList).toHaveBeenCalledWith({ filter: "today", search: null, cursor: null });
});

test("cambiar de filtro pide esa lista; tocar una fila abre el pedido", async () => {
  const onOpen = jest.fn();
  await renderWithProviders(<OrderList onOpen={onOpen} onNew={jest.fn()} />);
  await screen.findByText("#0044");
  await fireEvent.press(screen.getByRole("button", { name: "Por entregar" }));
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ filter: "to_deliver", search: null, cursor: null }));
  await fireEvent.press(await screen.findByRole("button", { name: /^#0044/ }));
  expect(onOpen).toHaveBeenCalledWith("id-44");
});

test("«Todos» llega de 20 en 20: al final pide la página siguiente", async () => {
  const first = Array.from({ length: 20 }, (_, index) => row(25 - index, { status: "delivered" }));
  const rest = Array.from({ length: 5 }, (_, index) => row(5 - index, { status: "delivered" }));
  mockList.mockImplementation(async ({ cursor }: { cursor: string | null }) =>
    cursor === null ? page(first, { total: 25, hasMore: true, nextCursor: "6" }) : page(rest, { total: 25 }),
  );
  await renderWithProviders(<OrderList onOpen={jest.fn()} onNew={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Todos" }));
  expect(await screen.findByText("Mostrando 20 de 25")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Cargar 5 más" })).toBeOnTheScreen();
  await fireEvent(screen.getByTestId("orders"), "onEndReached");
  expect(await screen.findByText("No hay más pedidos: ya ves los 25.")).toBeOnTheScreen();
  expect(mockList).toHaveBeenLastCalledWith({ filter: "all", search: null, cursor: "6" });
});

test("buscar «ana» pide la lista con la búsqueda, y sin resultados lo dice", async () => {
  await renderWithProviders(<OrderList onOpen={jest.fn()} onNew={jest.fn()} />);
  await screen.findByText("#0044");
  mockList.mockImplementation(async () => page([]));
  await fireEvent.changeText(screen.getByLabelText("Buscar pedidos"), "ana");
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ filter: "today", search: "ana", cursor: null }));
  expect(await screen.findByText("Ningún pedido de «Hoy» coincide con «ana».")).toBeOnTheScreen();
});

test("un filtro sin pedidos lo dice; los filtros muestran cuántos hay", async () => {
  mockList.mockImplementation(async () => page([]));
  await renderWithProviders(<OrderList onOpen={jest.fn()} onNew={jest.fn()} />);
  expect(await screen.findByText("No hay pedidos en «Hoy».")).toBeOnTheScreen();
  expect(within(screen.getByRole("button", { name: "Todos" })).getByText("25")).toBeOnTheScreen();
});

test("sin ningún pedido todavía, invita a anotar el primero", async () => {
  mockList.mockImplementation(async () => page([]));
  mockCounts.mockImplementationOnce(async () => ({ today: 0, toDeliver: 0, upcoming: 0, toCollect: 0, all: 0 }));
  const onNew = jest.fn();
  await renderWithProviders(<OrderList onOpen={jest.fn()} onNew={onNew} />);
  expect(await screen.findByText("Todavía no hay pedidos")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Anotar un pedido" }));
  expect(onNew).toHaveBeenCalled();
});
