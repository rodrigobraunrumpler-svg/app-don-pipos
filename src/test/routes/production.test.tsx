// Stock → Registrar producción → guardar → Deshacer, con las rutas de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import ProductStockScreen from "@/app/(main)/stock/[productId]";
import Stock from "@/app/(main)/stock/index";
import Production from "@/app/(main)/stock/production";
import { createQueryClient } from "@/lib/query";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => (jest.requireActual("@/test/stock-items") as { TEST_ITEMS: unknown }).TEST_ITEMS,
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
