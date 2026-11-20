import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import type { Ranking } from "../schema/report";
import { RankingScreen } from "./ranking-screen";

const mockRanking = jest.fn();
jest.mock("../api/reports", () => ({ getRanking: (from: string, to: string) => mockRanking(from, to) }));

const product = (
  productId: string,
  name: string,
  units: number,
  salesCents: number,
  costCents: number | null,
  profitCents: number | null,
) => ({
  productId,
  name,
  imageUrl: null,
  units,
  salesCents,
  costCents,
  profitCents,
});
const RANKING: Ranking = {
  products: [
    product("a1", "Coqueta", 5, 6000, 500, 3500),
    product("a5", "Pipo Crush", 5, 6500, null, null),
    product("a3", "Limon Kiss", 1, 1200, 600, 600),
  ],
  channels: { whatsapp: 2, local: 1, web: 0 },
  topCustomers: [],
};
const props = () => ({
  from: "2026-11-01",
  to: "2026-11-18",
  label: "Noviembre, hasta hoy",
  onBack: jest.fn(),
  onProducts: jest.fn(),
});
const order = () => screen.getAllByLabelText(/^\d\. /).map((row) => row.props.accessibilityLabel);

beforeEach(() => mockRanking.mockReset().mockResolvedValue(RANKING));

test("en unidades o en soles, por dónde llegan los pedidos y la ganancia por alfajor", async () => {
  await renderWithProviders(<RankingScreen {...props()} />);
  expect(await screen.findByText("Noviembre, hasta hoy, pedidos entregados")).toBeOnTheScreen();
  expect(mockRanking).toHaveBeenCalledWith("2026-11-01", "2026-11-18");
  await screen.findAllByLabelText(/^\d\. /);
  expect(order()).toEqual(["1. Coqueta: 5 unidades", "2. Pipo Crush: 5 unidades", "3. Limon Kiss: 1 unidad"]);
  await fireEvent.press(screen.getByRole("radio", { name: "Soles" }));
  expect(order()).toEqual([
    "1. Pipo Crush: S/\u00a065.00",
    "2. Coqueta: S/\u00a060.00",
    "3. Limon Kiss: S/\u00a012.00",
  ]);
  expect(screen.getByText("2 pedidos")).toBeOnTheScreen();
  expect(screen.getByText("1 pedido")).toBeOnTheScreen();
  expect(screen.getByText("En el local")).toBeOnTheScreen();
  expect(screen.getByText("Gana S/\u00a07.00 por alfajor (cuesta S/\u00a05.00)")).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a035.00")).toBeOnTheScreen();
  expect(screen.getByText("Sin costo: ponlo en Productos")).toBeOnTheScreen();
});

test("sin ningún costo, invita a ponerlos en Productos", async () => {
  mockRanking.mockResolvedValue({
    ...RANKING,
    products: RANKING.products.map((item) => ({ ...item, costCents: null, profitCents: null })),
  });
  const on = props();
  await renderWithProviders(<RankingScreen {...on} />);
  expect(
    await screen.findByText(
      "Pon un costo aproximado a cada alfajor en Productos y aquí verás cuánto ganas con cada uno.",
    ),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ir a Productos" }));
  expect(on.onProducts).toHaveBeenCalled();
});

test("sin pedidos entregados en el periodo, lo dice", async () => {
  mockRanking.mockResolvedValue({ products: [], channels: { whatsapp: 0, local: 0, web: 0 }, topCustomers: [] });
  await renderWithProviders(<RankingScreen {...props()} />);
  expect(await screen.findByText("Todavía no hay alfajores entregados en este periodo.")).toBeOnTheScreen();
});
