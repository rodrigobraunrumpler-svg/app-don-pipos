import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  focusManager,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
import * as Network from "expo-network";
import { AppState } from "react-native";

import { type AppError, isRetryable, toAppError } from "./errors";

// Cuánto se considera fresco cada tipo de dato (PROJECT_CONTEXT.md §14.2)
export const STALE_TIME = { catalog: 30 * 60_000, live: 30_000, reports: 5 * 60_000 } as const;
export const CACHE_MAX_AGE = 24 * 60 * 60_000;

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AppError;
    mutationMeta: { invalidates?: QueryKey[] };
  }
}

export function createQueryClient(options?: { onError?: (error: AppError) => void }): QueryClient {
  const report = (error: unknown): void => options?.onError?.(toAppError(error));
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: report }),
    mutationCache: new MutationCache({
      onError: report,
      // Cada mutación declara qué refresca en `meta.invalidates`; aquí se hace una sola vez para todas
      onSuccess: (_data, _variables, _context, mutation) => {
        for (const queryKey of mutation.meta?.invalidates ?? []) void client.invalidateQueries({ queryKey });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.live,
        gcTime: CACHE_MAX_AGE,
        retry: (failureCount, error) => isRetryable(toAppError(error)) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
  return client;
}

// La señal del celular. El aviso puede tardar, así que también se pregunta el estado al arrancar
export function setupOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    let initialized = false;
    const subscription = Network.addNetworkStateListener((state) => {
      initialized = true;
      setOnline(Boolean(state.isConnected));
    });
    Network.getNetworkStateAsync()
      .then((state) => {
        if (!initialized) setOnline(Boolean(state.isConnected));
      })
      .catch(() => undefined);
    return () => subscription.remove();
  });
}

// Al volver a la app, las consultas viejas se refrescan
export function setupFocusManager(): void {
  AppState.addEventListener("change", (status) => focusManager.setFocused(status === "active"));
}

// La caché se guarda en el celular: al abrir se ve lo último, y el skeleton sale solo la primera vez
export function createPersistOptions(buster: string): { persister: Persister; maxAge: number; buster: string } {
  return { persister: createAsyncStoragePersister({ storage: AsyncStorage }), maxAge: CACHE_MAX_AGE, buster };
}
