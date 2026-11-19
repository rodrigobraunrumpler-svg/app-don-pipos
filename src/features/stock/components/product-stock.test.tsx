import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";

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

const movement = (n: number) => ({
  id: `m${n}`,
  kind: "production",
  quantity: n,
  reason: null,
  happenedAt: new Date(Date.UTC(2026, 10, 1, 12 + n)).toISOString(),
});

afterEach(() => onlineManager.setOnline(true));

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
  await renderWithProviders(<ProductStock productId={COQUETA_ID} price={1200} onBack={jest.fn()} />);
  expect(await screen.findByText(`S/${NBSP}12.00`)).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Coqueta" })).toBeOnTheScreen();
  expect(screen.getByText("Alcanza")).toBeOnTheScreen();
  expect(screen.getByText("Disponible en la web")).toBeOnTheScreen();
  expect(screen.getByText("en stock")).toBeOnTheScreen();
  expect(screen.getByText("mínimo")).toBeOnTheScreen();
});

test("los movimientos por páginas: al llegar al final pide la siguiente con su cursor", async () => {
  await renderWithProviders(<ProductStock productId={COQUETA_ID} price={1200} onBack={jest.fn()} />);
  expect(await screen.findByText("Mostrando 20 de 25")).toBeOnTheScreen();
  expect(screen.getByText("+25")).toBeOnTheScreen();
  expect(mockMovements).toHaveBeenCalledWith({ productId: COQUETA_ID, cursor: null });
  await fireEvent(screen.getByTestId("movements"), "onEndReached");
  await waitFor(() => expect(mockMovements).toHaveBeenCalledWith({ productId: COQUETA_ID, cursor: "c1" }));
  expect(await screen.findByText("Mostrando 25 de 25")).toBeOnTheScreen();
});

test("«Anotar merma» abre la hoja con el alfajor ya elegido", async () => {
  await renderWithProviders(<ProductStock productId={COQUETA_ID} price={1200} onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar merma" }));
  expect(screen.getByRole("header", { name: "Anotar merma" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Más Coqueta" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Coqueta" })).toBeNull();
});

test("un alfajor que no está en el stock", async () => {
  await renderWithProviders(
    <ProductStock productId="00000000-0000-4000-8000-0000000000ff" price={undefined} onBack={jest.fn()} />,
  );
  expect(await screen.findByText("No se pudo cargar este alfajor")).toBeOnTheScreen();
});

test("al reabrir la app, el historial guardado en el celular se ve: sus fechas vuelven como texto", async () => {
  mockMovements.mockReset().mockReturnValue(new Promise(() => undefined));
  const { queryClient } = await renderWithProviders(
    <ProductStock productId={COQUETA_ID} price={1200} onBack={jest.fn()} />,
  );
  const restored = JSON.parse(
    JSON.stringify({
      pages: [{ items: [movement(3)], meta: { limit: 20, total: 1, hasMore: false, nextCursor: null } }],
      pageParams: [null],
    }),
  );
  await act(() => queryClient.setQueryData(["stock", "movements", COQUETA_ID], restored));
  expect(await screen.findByText("+3")).toBeOnTheScreen();
});

test("si los movimientos no cargan, lo dice y vuelve a intentar", async () => {
  mockMovements
    .mockReset()
    .mockRejectedValueOnce(new AppError("unexpected"))
    .mockResolvedValueOnce({
      items: [movement(1)],
      meta: { limit: 20, total: 1, hasMore: false, nextCursor: null },
    });
  await renderWithProviders(<ProductStock productId={COQUETA_ID} price={1200} onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Mostrando 1 de 1")).toBeOnTheScreen();
  expect(screen.queryByText("No se pudo cargar los movimientos")).toBeNull();
});

test("sin señal dice desde cuándo son los movimientos que se ven", async () => {
  await renderWithProviders(<ProductStock productId={COQUETA_ID} price={1200} onBack={jest.fn()} />);
  await screen.findByText("Mostrando 20 de 25");
  onlineManager.setOnline(false);
  expect(await screen.findByText(/^Sin conexión\. Ves los movimientos de las \d\d:\d\d\.$/)).toBeOnTheScreen();
});
