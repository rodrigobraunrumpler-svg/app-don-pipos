import { onlineManager } from "@tanstack/react-query";
import { fireEvent, screen, within } from "@testing-library/react-native";

import type { OrderSummary } from "@/features/orders";
import type { StockItem } from "@/features/stock";
import { businessDate, formatLongDate, previousDay } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import { greeting } from "../rules/greeting";
import type { HomeSummary } from "../schema/report";
import { HomeScreen } from "./home-screen";

const mockSummary = jest.fn();
const mockList = jest.fn();
const mockStock = jest.fn();
const mockSuggestion = jest.fn();
jest.mock("../api/reports", () => ({ getHomeSummary: () => mockSummary() }));
jest.mock("@/features/orders/api/orders", () => ({
  listOrders: (input: { filter: string }) => mockList(input.filter),
}));
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: () => mockStock(),
  getProductionSuggestion: () => mockSuggestion(),
}));

const today = businessDate(new Date());
const page = (items: OrderSummary[], total = items.length) => ({
  items,
  meta: { limit: 20, total, hasMore: total > items.length, nextCursor: null },
});
const order = (overrides: Partial<OrderSummary>): OrderSummary => ({
  id: "o44",
  number: 44,
  status: "preparing",
  fulfillment: "pickup",
  customerName: "Ana (DEMO)",
  itemsSummary: "2 Coquetas",
  totalCents: 2400,
  paidCents: 0,
  promisedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  dueDate: today,
  ...overrides,
});
const item = (overrides: Partial<StockItem>): StockItem => ({
  productId: "a1",
  name: "Coqueta",
  imageUrl: null,
  linkedToWeb: false,
  minStock: 6,
  onHand: 13,
  reserved: 0,
  physical: 13,
  coverageDays: 9,
  state: "ok",
  ...overrides,
});
const SUMMARY: HomeSummary = {
  collectedTodayCents: 6700,
  collectedByMethod: { cash: 2400, yape: 4300, plin: 0, transfer: 0 },
  deliveredToday: 3,
  toDeliver: 2,
  receivablesCents: 4100,
  cashClosedToday: false,
};
const EMPTY: HomeSummary = {
  collectedTodayCents: 0,
  collectedByMethod: { cash: 0, yape: 0, plin: 0, transfer: 0 },
  deliveredToday: 0,
  toDeliver: 0,
  receivablesCents: 0,
  cashClosedToday: false,
};

const handlers = () => ({
  onOpenOrder: jest.fn(),
  onOrders: jest.fn(),
  onReceivables: jest.fn(),
  onCash: jest.fn(),
  onStock: jest.fn(),
  onProduct: jest.fn(),
  onProduction: jest.fn(),
  onNewOrder: jest.fn(),
});

beforeEach(() => {
  mockSummary.mockReset().mockResolvedValue(SUMMARY);
  mockList.mockReset().mockImplementation(async (filter: string) =>
    // Como list_orders: del número más nuevo al más viejo
    filter === "to_deliver"
      ? page([
          order({}),
          order({
            id: "o37",
            number: 37,
            customerName: "Rosa (DEMO)",
            fulfillment: "delivery",
            promisedAt: null,
            dueDate: previousDay(today),
            status: "new",
          }),
        ])
      : page([order({ id: "o50", number: 50, dueDate: "2099-01-01", promisedAt: null, status: "new" })]),
  );
  mockStock
    .mockReset()
    .mockResolvedValue([
      item({}),
      item({ productId: "a2", name: "Morenita", onHand: 4, physical: 4, coverageDays: 1, state: "low" }),
      item({ productId: "a3", name: "Limon Kiss", onHand: 0, physical: 0, coverageDays: 0, state: "out" }),
      item({ productId: "a4", name: "Pipo Crush", onHand: -2, physical: -2, coverageDays: 0, state: "check" }),
    ]);
  mockSuggestion.mockReset().mockResolvedValue({
    ready: true,
    horizonDays: 7,
    items: [
      {
        productId: "a2",
        name: "Morenita",
        imageUrl: null,
        suggested: 30,
        expected: 28,
        weekdayUnits: 20,
        weekdayDays: 5,
        weekendUnits: 8,
        weekendDays: 2,
        minStock: 6,
        onHand: 4,
      },
      {
        productId: "a1",
        name: "Coqueta",
        imageUrl: null,
        suggested: 0,
        expected: 7,
        weekdayUnits: 5,
        weekdayDays: 5,
        weekendUnits: 2,
        weekendDays: 2,
        minStock: 6,
        onHand: 13,
      },
    ],
  });
});
afterEach(() => onlineManager.setOnline(true));

test("el saludo con la fecha, y lo urgente arriba en el orden de la maqueta, cada fila a lo suyo", async () => {
  const on = handlers();
  await renderWithProviders(<HomeScreen {...on} />);
  expect(screen.getByText(greeting(new Date()))).toBeOnTheScreen();
  expect(screen.getByText(formatLongDate(new Date()))).toBeOnTheScreen();
  const urgent = await screen.findByTestId("urgent");
  const rows = await within(urgent).findAllByRole("button");
  expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
    "#0037 de Rosa (DEMO) está atrasado desde ayer. Márcalo o avísale",
    expect.stringMatching(/^#0044 de Ana \(DEMO\) va 10 min tarde\. Recoge a las \d\d:\d\d: márcalo o avísale$/),
    "Limon Kiss está agotado. Registrar producción",
    "Revisa el stock de Pipo Crush. 2 vendidos de más: cuenta y ajusta",
    "Morenita alcanza hasta mañana. Registrar producción",
  ]);
  await fireEvent.press(rows[1]!);
  expect(on.onOpenOrder).toHaveBeenCalledWith("o44");
  await fireEvent.press(rows[2]!);
  expect(on.onProduction).toHaveBeenCalled();
  await fireEvent.press(rows[3]!);
  expect(on.onProduct).toHaveBeenCalledWith("a4");
});

test("lo cobrado hoy sin los medios en cero, y los números del día abren Pedidos con su filtro o Por cobrar", async () => {
  const on = handlers();
  await renderWithProviders(<HomeScreen {...on} />);
  expect(await screen.findByText("S/\u00a067.00")).toBeOnTheScreen();
  expect(screen.getByText("Efectivo")).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a043.00")).toBeOnTheScreen();
  expect(screen.queryByText("Plin")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Cuadrar caja" }));
  expect(on.onCash).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "3 entregados hoy" }));
  expect(on.onOrders).toHaveBeenLastCalledWith("today");
  await fireEvent.press(screen.getByRole("button", { name: "2 por entregar" }));
  expect(on.onOrders).toHaveBeenLastCalledWith("to_deliver");
  await fireEvent.press(screen.getByRole("button", { name: "S/\u00a041.00 por cobrar" }));
  expect(on.onReceivables).toHaveBeenCalled();
});

test("tu stock, qué producir y los pedidos por entregar y próximos", async () => {
  const on = handlers();
  await renderWithProviders(<HomeScreen {...on} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Morenita: 4 en stock. Ver detalle" }));
  expect(on.onProduct).toHaveBeenCalledWith("a2");
  await fireEvent.press(screen.getByRole("button", { name: "Ver stock" }));
  expect(on.onStock).toHaveBeenCalled();
  expect(await screen.findByText("Esta semana conviene hacer 30 alfajores")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Registrar producción" }));
  expect(on.onProduction).toHaveBeenCalled();
  await fireEvent.press(await screen.findByRole("button", { name: /^#0050/ }));
  expect(on.onOpenOrder).toHaveBeenCalledWith("o50");
  expect(screen.getByRole("header", { name: "Por entregar" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Próximos" })).toBeOnTheScreen();
});

test("un día sin pedidos invita a anotar uno", async () => {
  mockSummary.mockResolvedValue(EMPTY);
  mockList.mockResolvedValue(page([]));
  const on = handlers();
  await renderWithProviders(<HomeScreen {...on} />);
  expect(
    await screen.findByText("Todavía no hay pedidos hoy. Lo cobrado aparece aquí, separado por medio de pago."),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Cuadrar caja" })).toBeNull();
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar un pedido" }));
  expect(on.onNewOrder).toHaveBeenCalled();
});

test("sin señal, dice desde cuándo es lo que se ve", async () => {
  await renderWithProviders(<HomeScreen {...handlers()} />);
  await screen.findByText("S/\u00a067.00");
  onlineManager.setOnline(false);
  expect(await screen.findByText(/^Sin conexión\. Ves lo último que se cargó, a las \d\d:\d\d\.$/)).toBeOnTheScreen();
});

test("si una parte no carga, las demás se ven", async () => {
  mockSummary.mockRejectedValue(new AppError("unexpected"));
  await renderWithProviders(<HomeScreen {...handlers()} />);
  expect(await screen.findByText("No se pudo cargar lo cobrado hoy")).toBeOnTheScreen();
  expect(await screen.findByRole("button", { name: "Morenita: 4 en stock. Ver detalle" })).toBeOnTheScreen();
  mockSummary.mockResolvedValue(SUMMARY);
  await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("S/\u00a067.00")).toBeOnTheScreen();
});

test("con más pedidos por entregar de los que entran, una fila lleva a Pedidos", async () => {
  mockList.mockImplementation(async (filter: string) => (filter === "to_deliver" ? page([order({})], 24) : page([])));
  const on = handlers();
  await renderWithProviders(<HomeScreen {...on} />);
  await fireEvent.press(await screen.findByRole("button", { name: /^23 pedidos más por entregar\./ }));
  expect(on.onOrders).toHaveBeenCalledWith("to_deliver");
});
