// Productos y precios (fase 9), con las rutas de verdad: cómo va cada alfajor en la web, el aviso si la web no se
// actualiza, Ordenar (↑↓ y los más vendidos) y «Compartir» cuando un alfajor publicado ya está en la web
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";
import { Share } from "react-native";

import ProductsLayout from "@/app/(main)/settings/products/_layout";
import ProductsIndex from "@/app/(main)/settings/products/index";
import NewProduct from "@/app/(main)/settings/products/new";
import OrderProducts from "@/app/(main)/settings/products/order";
import PreviewProduct from "@/app/(main)/settings/products/preview";
import { createTestQueryClient } from "@/test/render";
import { TEST_PRODUCTS } from "@/test/products";
import { ThemeProvider } from "@/theme";

const [COQUETA, LIMON] = TEST_PRODUCTS as [(typeof TEST_PRODUCTS)[0], (typeof TEST_PRODUCTS)[0]];
const mockState: { list: unknown[]; bySales: boolean } = { list: [], bySales: false };
const mockReorder = jest.fn();
const mockSettings = jest.fn();
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => mockState.list,
  saveProduct: async (input: { name: string }) => {
    const product = {
      ...jest.requireActual("@/test/products").TEST_PRODUCTS[0],
      id: "n1",
      name: input.name,
      webState: "pending",
    };
    mockState.list = [product];
    return product;
  },
  uploadProductPhoto: async () => undefined,
  setProductPhoto: async () => ({}),
  reorderProducts: (ids: string[]) => mockReorder(ids),
}));
jest.mock("@/features/businesses/api/business", () => {
  const { TEST_BUSINESS } = jest.requireActual("@/test/business");
  return {
    getBusiness: async () => ({
      ...TEST_BUSINESS,
      settings: { ...TEST_BUSINESS.settings, productsBySales: mockState.bySales },
    }),
    updateSettings: (version: number, patch: { productsBySales: boolean }) => mockSettings(version, patch),
  };
});
jest.mock("@/lib/env", () => ({
  appEnv: {
    ok: true,
    env: {
      supabaseUrl: "https://x.supabase.co",
      supabaseKey: "k",
      supportWhatsapp: "51900000000",
      webUrl: "https://varmar.pe",
    },
  },
}));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchImageLibraryAsync: async () => ({
    canceled: false,
    assets: [{ uri: "file:///c.jpg", width: 1200, height: 1200 }],
  }),
}));
jest.mock("@/lib/images", () => ({ shrinkPhoto: async () => "QUJD" }));

beforeEach(() => {
  mockState.bySales = false;
  mockState.list = [
    { ...COQUETA, linkedToWeb: true, webState: "sent", isNew: true },
    { ...LIMON, linkedToWeb: true, webState: "hidden" },
  ];
  mockReorder.mockReset().mockResolvedValue([]);
  mockSettings.mockReset().mockImplementation(async () => {
    mockState.bySales = true;
    return { ...jest.requireActual("@/test/business").TEST_BUSINESS.settings, productsBySales: true, version: 2 };
  });
});

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
  "settings/products/preview": PreviewProduct,
  "settings/products/order": OrderProducts,
};
const open = () => renderRouter(ROUTES, { initialUrl: "/settings/products", wrapper: Providers });

test("cada alfajor dice cómo va en la web: «En la web» con «Nuevo», u «Oculto»", async () => {
  await open();
  expect(await screen.findByText("En la web")).toBeOnTheScreen();
  expect(screen.getByText("Nuevo")).toBeOnTheScreen();
  expect(screen.getByText("Oculto")).toBeOnTheScreen();
  expect(screen.queryByText(/La web no se está actualizando/)).toBeNull();
});

test("si alguno no se pudo subir, avisa que la web no se actualiza, con «Avisar al equipo»", async () => {
  mockState.list = [{ ...COQUETA, linkedToWeb: true, webState: "failing" }];
  await open();
  expect(
    await screen.findByText("La web no se está actualizando. Tus cambios están guardados en la app."),
  ).toBeOnTheScreen();
  expect(screen.getByText("No se pudo subir")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Avisar al equipo" })).toBeOnTheScreen();
});

test("Ordenar: ↑↓ cambia el orden de la web y «Listo» lo guarda", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Ordenar" }));
  expect(screen).toHavePathname("/settings/products/order");
  expect(await screen.findByRole("button", { name: "Subir Coqueta" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Bajar Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Listo" }));
  await waitFor(() => expect(mockReorder).toHaveBeenCalledWith([LIMON.id, COQUETA.id]));
  await waitFor(() => expect(screen).toHavePathname("/settings/products"));
});

test("«Los más vendidos primero» se guarda en el negocio y apaga las flechas", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Ordenar" }));
  await fireEvent(await screen.findByRole("switch", { name: "Los más vendidos primero" }), "valueChange", true);
  await waitFor(() => expect(mockSettings).toHaveBeenCalledWith(1, { productsBySales: true }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Bajar Coqueta" })).toBeDisabled());
});

test("al publicar uno nuevo, la lista sigue la copia y, cuando ya está en la web, ofrece «Compartir»", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Agregar producto" }));
  await fireEvent.press(screen.getByRole("button", { name: "De la galería" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Coqueta");
  await fireEvent.changeText(screen.getByLabelText("Precio"), "12");
  await fireEvent.changeText(screen.getByLabelText("Descripción"), "Frutos rojos");
  await fireEvent.press(screen.getByRole("button", { name: "Vista previa" }));
  await fireEvent.press(screen.getByRole("button", { name: "Publicar" }));
  expect(await screen.findByText("Coqueta se publicó en la web.")).toBeOnTheScreen();
  expect(screen.getByText("Subiendo a la web…")).toBeOnTheScreen();
  mockState.list = [{ ...(mockState.list[0] as object), webState: "sent", webSlug: "alfajor-coqueta" }];
  await act(() => jest.advanceTimersByTimeAsync(3500));
  expect(await screen.findByText("Coqueta ya está en la web.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Compartir" }));
  expect(share).toHaveBeenCalledWith({
    message: "Nuevo en Don Pipos: Alfajor Coqueta https://varmar.pe/don-pipos/alfajor-coqueta",
  });
  share.mockRestore();
});
