import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useRefreshOnFocus } from "./use-refresh-on-focus";

let mockFocus: (() => void) | undefined;
jest.mock("expo-router", () => ({ useFocusEffect: (effect: () => void) => (mockFocus = effect) }));

test("al volver a la pantalla recarga su consulta, pero no la primera vez (ya se está cargando)", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  await renderHook(() => useRefreshOnFocus(["stock", "overview"]), { wrapper });
  mockFocus?.();
  expect(invalidate).not.toHaveBeenCalled();
  mockFocus?.();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stock", "overview"] });
});
