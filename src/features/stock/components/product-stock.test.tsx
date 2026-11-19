import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";
import { COQUETA_ID } from "@/test/stock-items";

import { ProductStock } from "./product-stock";

const NBSP = " ";
const mockMovements = jest.fn();
jest.mock("../api/stock", () => ({
  getStockOverview: async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
  listProductMovements: (input: unknown) => mockMovements(input),
  registerWaste: jest.fn(),
  registerStockCount: jest.fn(),
  registerProduction: jest.fn(),
  revertStockChange: jest.fn(),
}));
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => [
    {
      id: "00000000-0000-4000-8000-000000000a01",
      name: "Coqueta",
      priceCents: 1200,
      costCents: null,
      minStock: 6,
      showOnWeb: true,
      isActive: true,
      sortOrder: 1,
      imageUrl: null,
      linkedToWeb: true,
      version: 1,
    },
  ],
  saveProduct: jest.fn(),
}));

const movement = (n: number) => ({
  id: `m${n}`,
  kind: "production",
  quantity: n,
  reason: null,
  happenedAt: new Date(Date.UTC(2026, 10, 1, 12 + n)),
});

beforeEach(() => {
  mockMovements.mockReset();
  mockMovements
    .mockResolvedValueOnce({
      items: Array.from({ length: 20 }, (_, index) => movement(25 - index)),
      meta: { limit: 20, total: 25, hasMore: true, nextCursor: "c1" },
    })
    .mockResolvedValueOnce({
      items: Array.from({ length: 5 }, (_, index) => movement(5 - index)),
      meta: { limit: 20, total: 25, hasMore: false, nextCursor: null },
    });
});

test("el alfajor con su precio, su estado, si está en la web, su stock y su mínimo", async () => {
  await renderWithProviders(<ProductStock productId={COQUETA_ID} onBack={jest.fn()} />);
  expect(await screen.findByText(`S/${NBSP}12.00`)).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Coqueta" })).toBeOnTheScreen();
  expect(screen.getByText("Alcanza")).toBeOnTheScreen();
  expect(screen.getByText("Disponible en la web")).toBeOnTheScreen();
  expect(screen.getByText("en stock")).toBeOnTheScreen();
  expect(screen.getByText("mínimo")).toBeOnTheScreen();
});

test("los movimientos por páginas: al llegar al final pide la siguiente con su cursor", async () => {
  await renderWithProviders(<ProductStock productId={COQUETA_ID} onBack={jest.fn()} />);
  expect(await screen.findByText("Mostrando 20 de 25")).toBeOnTheScreen();
  expect(screen.getByText("+25")).toBeOnTheScreen();
  expect(mockMovements).toHaveBeenCalledWith({ productId: COQUETA_ID, cursor: null });
  await fireEvent(screen.getByTestId("movements"), "onEndReached");
  await waitFor(() => expect(mockMovements).toHaveBeenCalledWith({ productId: COQUETA_ID, cursor: "c1" }));
  expect(await screen.findByText("Mostrando 25 de 25")).toBeOnTheScreen();
});

test("«Anotar merma» abre la hoja con el alfajor ya elegido", async () => {
  await renderWithProviders(<ProductStock productId={COQUETA_ID} onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar merma" }));
  expect(screen.getByRole("header", { name: "Anotar merma" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Más Coqueta" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Coqueta" })).toBeNull();
});

test("un alfajor que no está en el stock", async () => {
  await renderWithProviders(<ProductStock productId="00000000-0000-4000-8000-0000000000ff" onBack={jest.fn()} />);
  expect(await screen.findByText("No se pudo cargar este alfajor")).toBeOnTheScreen();
});
