// Guardar un alfajor (fase 9, detalles de la revisión final), con las rutas de verdad: el nombre repetido, uno de la
// puesta en marcha que se publica, y la foto que se prepara antes de guardar (o no se puede, o falta el negocio)
import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import EditProduct from "@/app/(main)/settings/products/[id]";
import ProductsLayout from "@/app/(main)/settings/products/_layout";
import ProductsIndex from "@/app/(main)/settings/products/index";
import NewProduct from "@/app/(main)/settings/products/new";
import PreviewProduct from "@/app/(main)/settings/products/preview";
import { createTestQueryClient } from "@/test/render";
import { TEST_PRODUCTS } from "@/test/products";
import { ThemeProvider } from "@/theme";

const NEW_ID = "00000000-0000-4000-8000-0000000000n1";
const COQUETA = {
  ...TEST_PRODUCTS[0]!,
  linkedToWeb: true,
  webState: "sent" as const,
  imageUrl: "https://cdn.sanity.io/x.jpg",
};
const mockState: { list: unknown[] } = { list: [COQUETA] };
const mockSave = jest.fn();
const mockUpload = jest.fn();
const mockSetPhoto = jest.fn();
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => mockState.list,
  saveProduct: (input: unknown) => mockSave(input),
  uploadProductPhoto: (input: unknown) => mockUpload(input),
  setProductPhoto: (id: string, path: string) => mockSetPhoto(id, path),
}));
const mockGetBusiness = jest.fn();
jest.mock("@/features/businesses/api/business", () => ({ getBusiness: () => mockGetBusiness() }));
const mockPick = jest.fn();
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: () => mockPick(),
  launchImageLibraryAsync: () => mockPick(),
}));
const mockShrink = jest.fn();
jest.mock("@/lib/images", () => ({ shrinkPhoto: () => mockShrink() }));

const photo = (side: number) => ({
  canceled: false,
  assets: [{ uri: "file:///coqueta.jpg", width: side, height: side }],
});
const saved = (over: object) => ({
  ...TEST_PRODUCTS[0]!,
  id: NEW_ID,
  name: "Coqueta",
  description: "Relleno de frutos rojos y bañado en chocolate",
  allergens: ["lacteos"],
  webState: "pending",
  ...over,
});

beforeEach(() => {
  mockState.list = [COQUETA];
  mockPick.mockReset().mockResolvedValue(photo(1200));
  mockShrink.mockReset().mockResolvedValue("QUJD");
  mockGetBusiness.mockReset().mockResolvedValue(jest.requireActual("@/test/business").TEST_BUSINESS);
  mockSave.mockReset().mockImplementation(async (input: { showOnWeb: boolean; id: string | null }) => {
    const product = saved({ showOnWeb: input.showOnWeb, version: input.id ? 3 : 1 });
    mockState.list = [COQUETA, product];
    return product;
  });
  mockUpload.mockReset().mockResolvedValue(undefined);
  mockSetPhoto.mockReset().mockResolvedValue(saved({ hasPhoto: true, version: 2 }));
});
afterEach(() => onlineManager.setOnline(true));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
const ROUTES = {
  "settings/products/_layout": ProductsLayout,
  "settings/products/index": ProductsIndex,
  "settings/products/new": NewProduct,
  "settings/products/[id]": EditProduct,
  "settings/products/preview": PreviewProduct,
};

// Un alfajor nuevo, «Tropi», con foto y descripción, que la base guarda y la lista muestra como `over` diga
function savesAs(over: object) {
  mockSave.mockImplementation(async (input: { showOnWeb: boolean }) => {
    const product = saved({ name: "Tropi", showOnWeb: input.showOnWeb, version: 1, ...over });
    mockState.list = [COQUETA, product];
    return product;
  });
}
async function fillTropi() {
  await fireEvent.press(screen.getByRole("button", { name: "De la galería" }));
  await fireEvent.changeText(await screen.findByLabelText("Nombre"), "Tropi");
  await fireEvent.changeText(screen.getByLabelText("Precio"), "13");
  await fireEvent.changeText(screen.getByLabelText("Descripción"), "Frutas tropicales");
}

async function fillNew() {
  await renderRouter(ROUTES, { initialUrl: "/settings/products", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: "Agregar producto" }));
  expect(screen).toHavePathname("/settings/products/new");
}

test("cambiarle el nombre a uno que ya tienes dice que el nombre está repetido", async () => {
  mockState.list = [COQUETA, { ...TEST_PRODUCTS[1]!, linkedToWeb: true, webState: "sent" }];
  mockSave.mockRejectedValue(new (jest.requireActual("@/lib/errors").AppError)("conflict"));
  await renderRouter(ROUTES, { initialUrl: "/settings/products", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: /^Coqueta/ }));
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Alfajor Limon Kiss");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Ya tienes un alfajor con ese nombre.")).toBeOnTheScreen();
});

test("uno de la puesta en marcha (ya con «Se ve») que recibe foto y descripción se publica con su aviso", async () => {
  const setup = saved({
    name: "Tropi",
    showOnWeb: true,
    description: null,
    hasPhoto: false,
    imageUrl: null,
    webState: "incomplete",
  });
  mockState.list = [COQUETA, setup];
  savesAs({ webState: "pending", version: 2 });
  await renderRouter(ROUTES, { initialUrl: "/settings/products", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: /^Tropi/ }));
  await fireEvent.press(screen.getByRole("button", { name: "De la galería" }));
  await fireEvent.changeText(await screen.findByLabelText("Descripción"), "Frutas tropicales");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Tropi se publicó en la web.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Deshacer" })).toBeOnTheScreen();
});

test("mientras se prepara la foto, «Guardar» espera: no se guarda dos veces", async () => {
  let ready: (value: string) => void = () => undefined;
  mockShrink.mockImplementation(() => new Promise<string>((resolve) => (ready = resolve)));
  savesAs({});
  await fillNew();
  await fillTropi();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  await act(async () => ready("QUJD"));
  await waitFor(() => expect(screen).toHavePathname("/settings/products"));
  expect(mockSave).toHaveBeenCalledTimes(1);
});

test("si la foto no se puede preparar, lo dice y no guarda nada", async () => {
  mockShrink.mockRejectedValue(new Error("sin memoria"));
  savesAs({});
  await fillNew();
  await fillTropi();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("No se pudo preparar la foto. Elige otra o tómala de nuevo.")).toBeOnTheScreen();
  expect(mockSave).not.toHaveBeenCalled();
});

test("sin el negocio cargado, la foto no se pierde: lo dice y no guarda", async () => {
  mockGetBusiness.mockImplementation(() => new Promise(() => undefined));
  savesAs({});
  await fillNew();
  await fillTropi();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(
    await screen.findByText("Todavía se está cargando tu negocio. Espera un momento y vuelve a guardar."),
  ).toBeOnTheScreen();
  expect(mockSave).not.toHaveBeenCalled();
});
