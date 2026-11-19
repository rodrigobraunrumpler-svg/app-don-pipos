// Stock con las rutas de verdad: tocar un alfajor abre su pantalla
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import ProductStockScreen from "@/app/(main)/stock/[productId]";
import Stock from "@/app/(main)/stock/index";
import { createQueryClient } from "@/lib/query";
import { ThemeProvider } from "@/theme";

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

test("tocar un alfajor abre su pantalla", async () => {
  await renderRouter(
    { "stock/index": Stock, "stock/[productId]": ProductStockScreen },
    { initialUrl: "/stock", wrapper: Providers },
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Coqueta: 13 en stock. Alcanza. Ver detalle" }));
  expect(screen).toHavePathname("/stock/00000000-0000-4000-8000-000000000a01");
});
