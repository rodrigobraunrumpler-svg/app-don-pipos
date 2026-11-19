// Stock con las rutas de verdad: tocar un alfajor abre su pantalla
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import ProductStockScreen from "@/app/(main)/stock/[productId]";
import Stock from "@/app/(main)/stock/index";
import { createQueryClient } from "@/lib/query";
import { ThemeProvider } from "@/theme";

const mockWaste = jest.fn();
const mockCount = jest.fn();
const mockRevert = jest.fn();
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => [
    {
      productId: "00000000-0000-4000-8000-000000000a01",
      name: "Coqueta",
      imageUrl: null,
      linkedToWeb: false,
      minStock: 6,
      onHand: 13,
      reserved: 0,
      physical: 13,
      state: "ok",
    },
  ],
  registerWaste: (input: unknown) => mockWaste(input),
  registerStockCount: (input: unknown) => mockCount(input),
  revertStockChange: (requestId: string) => mockRevert(requestId),
  listProductMovements: async () => ({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } }),
}));
jest.mock("@/features/products/api/products", () => ({ listProducts: async () => [], saveProduct: jest.fn() }));

function Providers({ children }: { children: ReactNode }) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

test("tocar un alfajor abre su pantalla", async () => {
  await renderRouter(
    { "stock/index": Stock, "stock/[productId]": ProductStockScreen },
    { initialUrl: "/stock", wrapper: Providers },
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Coqueta: 13 en stock. Alcanza. Ver detalle" }));
  expect(screen).toHavePathname("/stock/00000000-0000-4000-8000-000000000a01");
  expect(await screen.findByText("Todavía no hay movimientos.")).toBeOnTheScreen();
});

const open = () =>
  renderRouter(
    { "stock/index": Stock, "stock/[productId]": ProductStockScreen },
    { initialUrl: "/stock", wrapper: Providers },
  );

test("anotar una merma desde Stock, y deshacerla desde el aviso", async () => {
  mockWaste.mockResolvedValue({ productId: "00000000-0000-4000-8000-000000000a01", onHand: 12, outOnWeb: false });
  mockRevert.mockResolvedValue({ reverted: 1, items: [] });
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Anotar merma" }));
  await fireEvent.press(screen.getByRole("button", { name: "Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Regalo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar merma" }));
  expect(await screen.findByText("Merma anotada: 1 Coqueta.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  await waitFor(() => expect(mockRevert).toHaveBeenCalledWith(mockWaste.mock.calls[0][0].requestId));
  expect(await screen.findByText("Listo, se deshizo.")).toBeOnTheScreen();
});

test("contar el stock desde Stock", async () => {
  mockCount.mockResolvedValue({ adjustments: 1, items: [], backOnWeb: [], outOnWeb: [] });
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Contar stock" }));
  await fireEvent.press(screen.getByRole("button", { name: "Menos Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar 1 ajuste" }));
  expect(await screen.findByText("Conteo guardado: 1 ajuste.")).toBeOnTheScreen();
  expect(mockCount.mock.calls[0][0].counts).toEqual([
    { productId: "00000000-0000-4000-8000-000000000a01", counted: 12 },
  ]);
});
