// Productos y precios (Ajustes › Productos y precios, o Stock), con la ruta de verdad
import { QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactNode } from "react";

import Products from "@/app/(main)/settings/products";
import { createQueryClient } from "@/lib/query";
import { ThemeProvider } from "@/theme";

jest.mock("@/features/auth", () => ({ AccountSection: () => null }));
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => [
    {
      id: "00000000-0000-4000-8000-000000000a01",
      name: "Coqueta",
      priceCents: 1200,
      costCents: null,
      minStock: 6,
      showOnWeb: true,
      isActive: true,
      sortOrder: 1,
      imageUrl: null,
      linkedToWeb: false,
      version: 1,
    },
  ],
  saveProduct: jest.fn(),
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

test("Productos y precios abre la lista con sus alfajores", async () => {
  await renderRouter({ "settings/products": Products }, { initialUrl: "/settings/products", wrapper: Providers });
  expect(await screen.findByRole("button", { name: /^Coqueta/ })).toBeOnTheScreen();
});
