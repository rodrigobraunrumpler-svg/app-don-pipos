import { onlineManager } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import type { Product } from "../schema/product";
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

test("cada producto con su precio, su mínimo y su costo; «En la web» solo en el enlazado", async () => {
  await renderWithProviders(<ProductList onBack={jest.fn()} />);
  expect(await screen.findByText("Coqueta")).toBeOnTheScreen();
  expect(screen.getByText(`Mínimo 6, cuesta S/${NBSP}5.10`)).toBeOnTheScreen();
  expect(screen.getByText("Mínimo 4, cuesta sin definir")).toBeOnTheScreen();
  expect(screen.getAllByText("En la web")).toHaveLength(1);
  expect(screen.getByText("Se copian solos a la web")).toBeOnTheScreen();
});

test("sin productos enlazados, la app no promete nada de la web", async () => {
  mockList.mockResolvedValue([MORENITA]);
  await renderWithProviders(<ProductList onBack={jest.fn()} />);
  expect(await screen.findByText("Morenita")).toBeOnTheScreen();
  expect(screen.queryByText("Se copian solos a la web")).toBeNull();
  expect(screen.queryByText(/se ven en la web/)).toBeNull();
});

test("cambiar el precio a «12,50» guarda 1250 con su versión y lo avisa", async () => {
  mockSave.mockResolvedValue({ ...COQUETA, priceCents: 1250, version: 2 });
  await renderWithProviders(<ProductList onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Coqueta/ }));
  expect(screen.getByText(`Ganas S/${NBSP}6.90 por alfajor (57,5${NBSP}%)`)).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Precio en soles"), "12,50");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(mockSave).toHaveBeenCalledWith({
      id: COQUETA.id,
      expectedVersion: 1,
      name: "Coqueta",
      priceCents: 1250,
      costCents: 510,
      minStock: 6,
      showOnWeb: true,
    }),
  );
  expect(
    await screen.findByText(`Coqueta guardado: S/${NBSP}12.50. En la web se ve en unos segundos.`),
  ).toBeOnTheScreen();
});

test("un precio de 0 no se guarda", async () => {
  await renderWithProviders(<ProductList onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Morenita/ }));
  await fireEvent.changeText(screen.getByLabelText("Precio en soles"), "0");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(screen.getByText("Escribe un precio mayor que cero.")).toBeOnTheScreen();
  expect(mockSave).not.toHaveBeenCalled();
});

test("agregar un producto con un nombre que ya existe lo dice", async () => {
  mockSave.mockRejectedValue(new AppError("conflict"));
  await renderWithProviders(<ProductList onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Agregar producto" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre del producto"), "coqueta");
  await fireEvent.changeText(screen.getByLabelText("Precio en soles"), "12");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Ya tienes un producto con ese nombre.")).toBeOnTheScreen();
  expect(mockSave).toHaveBeenCalledWith({
    id: null,
    expectedVersion: null,
    name: "coqueta",
    priceCents: 1200,
    costCents: null,
    minStock: 0,
    showOnWeb: true,
  });
});

test("sin señal lo dice, y «Guardar» se apaga", async () => {
  await renderWithProviders(<ProductList onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: /^Coqueta/ }));
  onlineManager.setOnline(false);
  expect(await screen.findByText("Sin conexión. Para cambiar precios, espera la señal.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
});

test("si no se pudo cargar, lo dice y vuelve a intentar", async () => {
  mockList.mockRejectedValueOnce(new AppError("offline"));
  await renderWithProviders(<ProductList onBack={jest.fn()} />);
  expect(await screen.findByText("No se pudo cargar tus productos")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Coqueta")).toBeOnTheScreen();
});
