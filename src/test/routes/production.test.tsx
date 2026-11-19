// Stock → Registrar producción → guardar → Deshacer, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import ProductStockScreen from "@/app/(main)/stock/[productId]";
import StockLayout from "@/app/(main)/stock/_layout";
import Stock from "@/app/(main)/stock/index";
import Production from "@/app/(main)/stock/production";
import { createQueryClient } from "@/lib/query";
import { ThemeProvider } from "@/theme";

const mockOverview = jest.fn(
  async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
);
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: () => mockOverview(),
  registerProduction: async () => ({ total: 3, items: [], backOnWeb: [] }),
  revertStockChange: async () => ({ reverted: 1, items: [] }),
  registerWaste: jest.fn(),
  registerStockCount: jest.fn(),
}));

function Providers({ children }: { children: ReactNode }) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

test("registrar una producción desde Stock y deshacerla", async () => {
  await renderRouter(
    { "stock/index": Stock, "stock/production": Production, "stock/[productId]": ProductStockScreen },
    { initialUrl: "/stock", wrapper: Providers },
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Registrar producción" }));
  expect(screen).toHavePathname("/stock/production");
  for (let count = 0; count < 3; count += 1)
    await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar producción: 3 alfajores" }));
  expect(await screen.findByText("Sumaste 3 alfajores y el stock ya está al día.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  expect(await screen.findByText("Producción deshecha.")).toBeOnTheScreen();
});

test("volver de Registrar producción no vuelve a pedir el stock recién cargado ni muestra la rueda de recarga", async () => {
  // Con el Stack de Stock, como en la app: la pantalla de Stock queda montada y vuelve a tener el foco
  await renderRouter(
    {
      "stock/_layout": StockLayout,
      "stock/index": Stock,
      "stock/production": Production,
      "stock/[productId]": ProductStockScreen,
    },
    { initialUrl: "/stock", wrapper: Providers },
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Registrar producción" }));
  await screen.findByRole("button", { name: "Más Coqueta" });
  const calls = mockOverview.mock.calls.length;
  // Si se volviera a pedir, quedaría cargando
  mockOverview.mockReturnValueOnce(new Promise(() => undefined));
  await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
  await act(() => jest.advanceTimersByTimeAsync(500));
  expect(screen).toHavePathname("/stock");
  expect(screen.getByTestId("stock-scroll").props.refreshControl.props.refreshing).toBe(false);
  expect(mockOverview).toHaveBeenCalledTimes(calls);
});
