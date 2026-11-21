import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import type { Product } from "../schema/product";
import { ProductDraftProvider } from "./product-draft-provider";
import { ProductList } from "./product-list";

const NBSP = " ";
const mockList = jest.fn();
const mockSave = jest.fn();
jest.mock("../api/products", () => ({
  listProducts: () => mockList(),
  saveProduct: (input: unknown) => mockSave(input),
}));

const product = (overrides: Partial<Product>): Product => ({
  id: "00000000-0000-4000-8000-000000000a01",
  name: "Coqueta",
  priceCents: 1200,
  costCents: 510,
  minStock: 6,
  showOnWeb: true,
  isActive: true,
  sortOrder: 1,
  imageUrl: null,
  linkedToWeb: true,
  description: null,
  allergens: [],
  hasPhoto: false,
  webSlug: null,
  isNew: false,
  webState: "sent",
  version: 1,
  ...overrides,
});
const COQUETA = product({});
const MORENITA = product({
  id: "00000000-0000-4000-8000-000000000a02",
  name: "Morenita",
  costCents: null,
  minStock: 4,
  sortOrder: 2,
  linkedToWeb: false,
});

beforeEach(() => {
  mockList.mockReset().mockResolvedValue([COQUETA, MORENITA]);
  mockSave.mockReset();
});
afterEach(() => onlineManager.setOnline(true));

const handlers = () => ({ onBack: jest.fn(), onOpen: jest.fn(), onNew: jest.fn(), onOrder: jest.fn() });
const list = (on = handlers()) =>
  renderWithProviders(
    <ProductDraftProvider businessId="b1">
      <ProductList {...on} />
    </ProductDraftProvider>,
  );

test("cada alfajor con su precio, su mínimo, su costo y cómo va en la web", async () => {
  await list();
  expect(await screen.findByText("Coqueta")).toBeOnTheScreen();
  expect(screen.getByText(`Mínimo 6, cuesta S/${NBSP}5.10`)).toBeOnTheScreen();
  expect(screen.getByText("Mínimo 4, cuesta sin definir")).toBeOnTheScreen();
  expect(screen.getAllByText("En la web")).toHaveLength(2);
});

test("tocar un alfajor lo abre; «Agregar producto» y «Ordenar» llevan a sus pantallas", async () => {
  const on = handlers();
  await list(on);
  await fireEvent.press(await screen.findByRole("button", { name: /^Coqueta/ }));
  expect(on.onOpen).toHaveBeenCalledWith(COQUETA);
  await fireEvent.press(screen.getByRole("button", { name: "Agregar producto" }));
  expect(on.onNew).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Ordenar" }));
  expect(on.onOrder).toHaveBeenCalled();
});

test("sin señal lo dice", async () => {
  await list();
  await screen.findByText("Coqueta");
  onlineManager.setOnline(false);
  expect(await screen.findByText("Sin conexión. Para cambiar un alfajor, espera la señal.")).toBeOnTheScreen();
});

test("si no se pudo cargar, lo dice y vuelve a intentar", async () => {
  mockList.mockRejectedValueOnce(new AppError("offline"));
  await list();
  expect(await screen.findByText("No se pudo cargar tus productos")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Coqueta")).toBeOnTheScreen();
});

test("al tirar hacia abajo, vuelve a cargar la lista", async () => {
  await list();
  await screen.findByText("Coqueta");
  // En Jest, el control de tirar hacia abajo queda como propiedad de la lista
  await act(() => screen.getByTestId("products-scroll").props.refreshControl.props.onRefresh());
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
});

test("la rueda de recarga sale cuando el dueño tira hacia abajo, no con cada recarga de fondo", async () => {
  const { queryClient } = await list();
  await screen.findByText("Coqueta");
  mockList.mockReturnValue(new Promise(() => undefined));
  // TanStack avisa los cambios un instante después: se espera un poco antes de mirar
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  await act(() => void queryClient.invalidateQueries({ queryKey: ["products"] }));
  await settle();
  expect(screen.getByTestId("products-scroll").props.refreshControl.props.refreshing).toBe(false);
  await act(() => void screen.getByTestId("products-scroll").props.refreshControl.props.onRefresh());
  await settle();
  expect(screen.getByTestId("products-scroll").props.refreshControl.props.refreshing).toBe(true);
});
