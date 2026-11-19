import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { createQueryClient } from "@/lib/query";
import { ThemeProvider, type Scheme } from "@/theme";

// Para las pruebas de pantallas y componentes: el tema pedido y un cliente de consultas nuevo en cada llamada.
// Sin reintentos (una falla se ve al instante) y sin temporizadores de caché que dejen a Jest esperando
export async function renderWithProviders(ui: ReactElement, options?: { scheme?: Scheme }) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } });
  const result = await render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider forcedScheme={options?.scheme}>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}
