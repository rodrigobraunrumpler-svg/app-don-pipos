import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  type DehydrateOptions,
  focusManager,
  MutationCache,
  onlineManager,
  type Query,
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
// Sube en 1 cada vez que cambia la forma de lo que devuelve una consulta: al abrir la app, lo guardado con la forma
// anterior se descarta. La versión de la app sola no alcanza: no cambia durante el desarrollo ni con EAS Update
export const CACHE_SCHEMA = 1;

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AppError;
    mutationMeta: { invalidates?: QueryKey[] };
    // Con `persist: false`, la consulta no se guarda en el celular
    queryMeta: { persist?: boolean };
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
        retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
      },
      // «always»: sin señal, un guardado se intenta igual, falla al momento y avisa «sin conexión».
      // Por defecto quedaría en espera, sin aviso, y saldría solo al volver la señal (guardar sin señal queda para después, §14.2)
      mutations: { retry: false, networkMode: "always" },
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

type PersistOptions = { persister: Persister; maxAge: number; buster: string; dehydrateOptions: DehydrateOptions };

// Una consulta se guarda si cargó bien, no pidió quedar fuera y su dato tiene menos de un día.
// La librería solo mira cuándo se guardó la caché entera: sin esto, un dato que nadie vuelve a pedir se guardaría para siempre
const shouldPersistQuery = (query: Query): boolean =>
  query.state.status === "success" &&
  query.meta?.persist !== false &&
  Date.now() - query.state.dataUpdatedAt <= CACHE_MAX_AGE;

// La caché se guarda en el celular: al abrir se ve lo último, y el skeleton sale solo la primera vez.
// Solo se guarda lo leído: lo que se estaba guardando (con sus datos) nunca se escribe en el celular
export function createPersistOptions(appVersion: string): PersistOptions {
  return {
    persister: createAsyncStoragePersister({ storage: AsyncStorage }),
    maxAge: CACHE_MAX_AGE,
    buster: `${appVersion}-${CACHE_SCHEMA}`,
    dehydrateOptions: { shouldDehydrateMutation: () => false, shouldDehydrateQuery: shouldPersistQuery },
  };
}
