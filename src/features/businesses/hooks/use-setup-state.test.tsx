import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AppError } from "@/lib/errors";
import { TEST_BUSINESS } from "@/test/business";
import { createTestQueryClient } from "@/test/render";

import { useSetupState } from "./use-setup-state";

const mockGetBusiness = jest.fn();
jest.mock("../api/business", () => ({ getBusiness: () => mockGetBusiness() }));

async function stateWith(enabled = true) {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSetupState(enabled), { wrapper });
}

test("sin la puesta en marcha manda a hacerla; hecha, a Inicio", async () => {
  mockGetBusiness.mockResolvedValue({ ...TEST_BUSINESS, setupDone: false });
  const needed = await stateWith();
  await waitFor(() => expect(needed.result.current).toBe("needed"));
  mockGetBusiness.mockResolvedValue(TEST_BUSINESS);
  const done = await stateWith();
  await waitFor(() => expect(done.result.current).toBe("done"));
});

test("mientras lo pide por primera vez, espera", async () => {
  mockGetBusiness.mockReturnValue(new Promise(() => undefined));
  const { result } = await stateWith();
  expect(result.current).toBe("loading");
});

test("después de un fallo no espera los reintentos: entra a Inicio", async () => {
  const client = createTestQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: 3, retryDelay: 60_000 } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  mockGetBusiness.mockRejectedValue(new AppError("unexpected"));
  const { result } = await renderHook(() => useSetupState(true), { wrapper });
  await waitFor(() => expect(result.current).toBe("done"));
});

test("si no se puede saber (error) o no hay sesión, entra a Inicio: nunca se queda bloqueada", async () => {
  mockGetBusiness.mockRejectedValue(new AppError("offline"));
  const failed = await stateWith();
  await waitFor(() => expect(failed.result.current).toBe("done"));
  mockGetBusiness.mockClear();
  const signedOut = await stateWith(false);
  expect(signedOut.result.current).toBe("done");
  expect(mockGetBusiness).not.toHaveBeenCalled();
});
