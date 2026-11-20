import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import type { StockItem } from "../schema/stock";
import { StockOverview } from "./stock-overview";

const mockOverview = jest.fn();
const mockSuggestion = jest.fn();
jest.mock("../api/stock", () => ({
  getStockOverview: () => mockOverview(),
  getProductionSuggestion: () => mockSuggestion(),
}));

const item = (overrides: Partial<StockItem>): StockItem => ({
  productId: "00000000-0000-4000-8000-000000000a01",
  name: "Coqueta",
  imageUrl: null,
  linkedToWeb: false,
  minStock: 6,
  onHand: 13,
  reserved: 0,
  physical: 13,
  coverageDays: null,
  state: "ok",
  ...overrides,
});
const ITEMS = [
  item({ linkedToWeb: true }),
  item({ productId: "a2", name: "Morenita", onHand: 4, physical: 4, state: "low" }),
  item({ productId: "a3", name: "Limon Kiss", onHand: 0, physical: 0, state: "out", linkedToWeb: true, minStock: 5 }),
  item({ productId: "a4", name: "Pipo Crush", onHand: -2, physical: -2, state: "check", minStock: 4 }),
  item({ productId: "a5", name: "Manteadita", onHand: -14, reserved: 24, physical: 10, state: "owed" }),
];

const handlers = () => ({ onOpenProduct: jest.fn(), onRegisterProduction: jest.fn(), onGoToProducts: jest.fn() });

beforeEach(() => {
  mockOverview.mockReset().mockResolvedValue(ITEMS);
  mockSuggestion.mockReset().mockResolvedValue({ ready: false, horizonDays: 7, items: [] });
});
afterEach(() => onlineManager.setOnline(true));

test("cada alfajor con su línea, su número y su estado; «Agotado en la web» solo en el enlazado sin stock", async () => {
  await renderWithProviders(<StockOverview {...handlers()} />);
  expect(await screen.findByText("Coqueta")).toBeOnTheScreen();
  expect(screen.getAllByText("Mínimo 6")).toHaveLength(2);
  expect(screen.getByText("Sin stock")).toBeOnTheScreen();
  expect(screen.getByText("2 vendidos de más: cuenta y ajusta")).toBeOnTheScreen();
  expect(screen.getByText("Faltan 14 para pedidos: produce")).toBeOnTheScreen();
  for (const label of ["Alcanza", "Poco", "Agotado", "Revisar", "Faltan"])
    expect(screen.getByText(label)).toBeOnTheScreen();
  expect(screen.getAllByText("Agotado en la web")).toHaveLength(1);
  expect(screen.getByText(/^Actualizado a las \d\d:\d\d$/)).toBeOnTheScreen();
});

test("tocar un alfajor lo abre, y «Registrar producción» lleva a la producción", async () => {
  const props = handlers();
  await renderWithProviders(<StockOverview {...props} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Morenita: 4 en stock. Poco. Ver detalle" }));
  expect(props.onOpenProduct).toHaveBeenCalledWith("a2");
  await fireEvent.press(screen.getByRole("button", { name: "Registrar producción" }));
  expect(props.onRegisterProduction).toHaveBeenCalledTimes(1);
});

test("sin productos, lleva a Ajustes", async () => {
  mockOverview.mockResolvedValue([]);
  const props = handlers();
  await renderWithProviders(<StockOverview {...props} />);
  expect(await screen.findByText("Todavía no hay productos")).toBeOnTheScreen();
  expect(
    screen.getByText("Agrega tus alfajores con su precio en Ajustes para empezar a llevar el stock."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ir a Ajustes" }));
  expect(props.onGoToProducts).toHaveBeenCalledTimes(1);
});

test("sin señal se ve lo último, con su hora, y no se puede registrar", async () => {
  await renderWithProviders(<StockOverview {...handlers()} />);
  await screen.findByText("Coqueta");
  onlineManager.setOnline(false);
  expect(
    await screen.findByText(/^Sin conexión\. Ves el stock de las \d\d:\d\d; para registrar, espera la señal\.$/),
  ).toBeOnTheScreen();
  for (const name of ["Anotar merma", "Registrar producción", "Contar stock"])
    expect(screen.getByRole("button", { name })).toBeDisabled();
});

test("si no se pudo cargar, lo dice", async () => {
  mockOverview.mockRejectedValue(new AppError("offline"));
  await renderWithProviders(<StockOverview {...handlers()} />);
  expect(await screen.findByText("No se pudo cargar el stock")).toBeOnTheScreen();
});

test("la rueda de recarga sale cuando el dueño tira hacia abajo, no con cada recarga de fondo", async () => {
  const { queryClient } = await renderWithProviders(<StockOverview {...handlers()} />);
  await screen.findByText("Coqueta");
  mockOverview.mockReturnValue(new Promise(() => undefined));
  // TanStack avisa los cambios un instante después: se espera un poco antes de mirar
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  await act(() => void queryClient.invalidateQueries({ queryKey: ["stock"] }));
  await settle();
  expect(screen.getByTestId("stock-scroll").props.refreshControl.props.refreshing).toBe(false);
  await act(() => void screen.getByTestId("stock-scroll").props.refreshControl.props.onRefresh());
  await settle();
  expect(screen.getByTestId("stock-scroll").props.refreshControl.props.refreshing).toBe(true);
});

const suggestion = (amounts: number[]) => ({
  ready: true,
  horizonDays: 7,
  items: amounts.map((suggested, index) => ({
    productId: `p${index}`,
    name: "Coqueta",
    imageUrl: null,
    suggested,
    expected: 43,
    weekdayUnits: 25,
    weekdayDays: 5,
    weekendUnits: 18,
    weekendDays: 2,
    minStock: 6,
    onHand: 13,
  })),
});

test("la sugerencia de la semana lleva a Registrar producción; al día, lo dice; sin historia, nada", async () => {
  mockSuggestion.mockResolvedValue(suggestion([36, 109]));
  const actions = handlers();
  const first = await renderWithProviders(<StockOverview {...actions} />);
  expect(await screen.findByText("Esta semana conviene hacer 145 alfajores")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: /Ver cuánto de cada uno$/ }));
  expect(actions.onRegisterProduction).toHaveBeenCalled();
  await first.unmount();

  mockSuggestion.mockResolvedValue(suggestion([0, 0]));
  const second = await renderWithProviders(<StockOverview {...handlers()} />);
  expect(await screen.findByText("Tu producción está al día para esta semana.")).toBeOnTheScreen();
  await second.unmount();

  mockSuggestion.mockResolvedValue({ ready: false, horizonDays: 7, items: [] });
  await renderWithProviders(<StockOverview {...handlers()} />);
  await screen.findByText("Coqueta");
  await waitFor(() => expect(mockSuggestion).toHaveBeenCalledTimes(3));
  expect(screen.queryByText(/conviene hacer|al día para/)).toBeNull();
});
