import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { createQueryClient } from "@/lib/query";
import { ThemeProvider, type Scheme } from "@/theme";

// Para las pruebas de pantallas y componentes: el tema pedido y un cliente de consultas nuevo en cada llamada.
// Es el cliente de la app, con dos cambios: sin reintentos (una falla se ve al instante) y sin temporizadores
// de caché que dejen a Jest esperando. Lo demás (cuánto dura fresco un dato, cómo se guarda) queda igual que en la app
export async function renderWithProviders(ui: ReactElement, options?: { scheme?: Scheme }) {
  const queryClient = createQueryClient();
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false, gcTime: Infinity },
    mutations: { ...defaults.mutations, gcTime: Infinity },
  });
  const result = await render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider forcedScheme={options?.scheme}>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}
