// Nuevo alfajor y Editar (fase 9), con las rutas de verdad: la foto con su recorte, la descripción, los alérgenos, la
// vista previa de la web, publicar con «Deshacer», y la foto que espera la señal
import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
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
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => jest.requireActual("@/test/business").TEST_BUSINESS,
}));
const mockPick = jest.fn();
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: () => mockPick(),
  launchImageLibraryAsync: () => mockPick(),
}));
jest.mock("@/lib/images", () => ({ shrinkPhoto: async () => "QUJD" }));

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

test("nuevo alfajor: sin foto ni descripción no se puede mostrar en la web; con todo, vista previa y publicar", async () => {
  await fillNew();
  expect(screen.getByText("Falta la foto y la descripción")).toBeOnTheScreen();
  expect(screen.getByRole("switch", { name: "Se ve en la web" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "De la galería" }));
  expect(await screen.findByLabelText("Foto del alfajor")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Coqueta");
  await fireEvent.changeText(screen.getByLabelText("Precio"), "12");
  await fireEvent.changeText(screen.getByLabelText("Descripción"), "Relleno de frutos rojos y bañado en chocolate");
  expect(screen.getByText("45/400")).toBeOnTheScreen();
  expect(screen.getByText("En la web: «Alfajor Coqueta»")).toBeOnTheScreen();
  expect(screen.getByRole("switch", { name: "Se ve en la web" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Lácteos" }));
  await fireEvent.press(screen.getByRole("button", { name: "Vista previa" }));
  expect(screen).toHavePathname("/settings/products/preview");
  expect(screen.getByText("Alfajor Coqueta")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Publicar" }));
  await waitFor(() => expect(screen).toHavePathname("/settings/products"));
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({
      id: null,
      name: "Coqueta",
      priceCents: 1200,
      showOnWeb: true,
      description: "Relleno de frutos rojos y bañado en chocolate",
      allergens: ["lacteos"],
    }),
  );
  await waitFor(() =>
    expect(mockUpload).toHaveBeenCalledWith({
      path: expect.stringMatching(new RegExp(`/${NEW_ID}/.+\\.jpg$`)),
      base64: "QUJD",
    }),
  );
  expect(mockSetPhoto).toHaveBeenCalledWith(NEW_ID, expect.stringMatching(/\.jpg$/));
  expect(await screen.findByText("Coqueta se publicó en la web.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  await waitFor(() =>
    expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ id: NEW_ID, showOnWeb: false })),
  );
});

test("una foto chica avisa que en la web se vería borrosa; «Usar igual» la deja", async () => {
  mockPick.mockResolvedValue(photo(800));
  await fillNew();
  await fireEvent.press(screen.getByRole("button", { name: "Tomar foto" }));
  expect(
    await screen.findByText("Esta foto es chica: en la web se vería borrosa. Tómala de más cerca o con más luz."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Usar igual" }));
  expect(screen.queryByText(/Esta foto es chica/)).toBeNull();
  expect(screen.getByLabelText("Foto del alfajor")).toBeOnTheScreen();
});

test("uno que ya está en la web no necesita foto ni descripción en la app, y guardar vuelve a la lista", async () => {
  await renderRouter(ROUTES, { initialUrl: "/settings/products", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: /^Coqueta/ }));
  expect(screen).toHavePathname(`/settings/products/${COQUETA.id}`);
  expect(screen.getByRole("switch", { name: "Se ve en la web" })).toBeEnabled();
  expect(screen.queryByText(/^Falta/)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText("Precio"), "13");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(screen).toHavePathname("/settings/products"));
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ id: COQUETA.id, expectedVersion: 1, priceCents: 1300 }),
  );
  expect(await screen.findByText("Coqueta guardado.")).toBeOnTheScreen();
});

test("«Volver» desanda el camino: de la vista previa al alfajor, y del alfajor a la lista", async () => {
  await fillNew();
  await fireEvent.press(screen.getByRole("button", { name: "De la galería" }));
  await fireEvent.changeText(screen.getByLabelText("Descripción"), "Frutos rojos");
  await fireEvent.press(await screen.findByRole("button", { name: "Vista previa" }));
  expect(screen).toHavePathname("/settings/products/preview");
  await act(() => router.back());
  expect(screen).toHavePathname("/settings/products/new");
  expect(screen.getByLabelText("Descripción")).toHaveDisplayValue("Frutos rojos");
  await act(() => router.back());
  expect(screen).toHavePathname("/settings/products");
});

test("si la foto no sube (sin señal), el alfajor queda guardado y la lista dice que la foto espera la señal", async () => {
  mockUpload.mockRejectedValue(new (jest.requireActual("@/lib/errors").AppError)("network"));
  await fillNew();
  await fireEvent.press(screen.getByRole("button", { name: "De la galería" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Coqueta");
  await fireEvent.changeText(screen.getByLabelText("Precio"), "12");
  await fireEvent.changeText(screen.getByLabelText("Descripción"), "Frutos rojos");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(screen).toHavePathname("/settings/products"));
  expect(await screen.findByText("La foto espera la señal")).toBeOnTheScreen();
});

test("si la señal se va justo después de guardar, la foto espera y se sube sola cuando vuelve", async () => {
  savesAs({});
  const save = mockSave.getMockImplementation()!;
  mockSave.mockImplementation(async (input: unknown) => {
    const product = await save(input);
    onlineManager.setOnline(false);
    return product;
  });
  await fillNew();
  await fillTropi();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(screen).toHavePathname("/settings/products"));
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(mockUpload).not.toHaveBeenCalled();
  await act(async () => onlineManager.setOnline(true));
  await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(mockSetPhoto).toHaveBeenCalledWith(NEW_ID, expect.stringMatching(/\.jpg$/)));
});

test("mientras la foto sube, la fila dice «Subiendo a la web…», no que le falta la foto", async () => {
  let landed: () => void = () => undefined;
  mockUpload.mockImplementation(() => new Promise<void>((resolve) => (landed = resolve)));
  savesAs({ webState: "incomplete", hasPhoto: false });
  await fillNew();
  await fillTropi();
  await fireEvent.press(screen.getByRole("button", { name: "Vista previa" }));
  await fireEvent.press(screen.getByRole("button", { name: "Publicar" }));
  await waitFor(() => expect(screen).toHavePathname("/settings/products"));
  await waitFor(() => expect(mockUpload).toHaveBeenCalled());
  expect(await screen.findByText("Subiendo a la web…")).toBeOnTheScreen();
  expect(screen.queryByText("Le falta foto o descripción")).toBeNull();
  await act(async () => landed());
});

test("publicar uno con un nombre que ya tienes lo dice así", async () => {
  mockSave.mockRejectedValue(new (jest.requireActual("@/lib/errors").AppError)("conflict"));
  await fillNew();
  await fillTropi();
  await fireEvent.press(screen.getByRole("button", { name: "Vista previa" }));
  await fireEvent.press(screen.getByRole("button", { name: "Publicar" }));
  expect(await screen.findByText("Ya tienes un alfajor con ese nombre.")).toBeOnTheScreen();
});

test("reabrir uno recién publicado mientras su foto sube y guardarlo no lo saca de la web", async () => {
  mockState.list = [
    COQUETA,
    saved({ name: "Tropi", showOnWeb: true, hasPhoto: false, imageUrl: null, webState: "incomplete" }),
  ];
  await renderRouter(ROUTES, { initialUrl: "/settings/products", wrapper: Providers });
  await fireEvent.press(await screen.findByRole("button", { name: /^Tropi/ }));
  expect(screen.getByRole("switch", { name: "Se ve en la web" })).toBeEnabled();
  await fireEvent.changeText(screen.getByLabelText("Precio"), "14");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ id: NEW_ID, showOnWeb: true })));
});
