import { focusManager, MutationObserver, onlineManager, QueryObserver } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";

import { AppError } from "@/lib/errors";
import {
  CACHE_MAX_AGE,
  createPersistOptions,
  createQueryClient,
  setupFocusManager,
  setupOnlineManager,
  STALE_TIME,
} from "@/lib/query";

jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

const clients: ReturnType<typeof createQueryClient>[] = [];
const newClient = (...args: Parameters<typeof createQueryClient>) => {
  const client = createQueryClient(...args);
  clients.push(client);
  return client;
};
// Sin esto, la caché de 24 horas deja temporizadores vivos y Jest no termina
afterEach(() => clients.splice(0).forEach((client) => client.clear()));

test("los tiempos de vida son los del documento", () => {
  expect(STALE_TIME).toEqual({ catalog: 1_800_000, live: 30_000, reports: 300_000 });
  expect(CACHE_MAX_AGE).toBe(86_400_000);
  const defaults = newClient().getDefaultOptions();
  expect(defaults.queries?.staleTime).toBe(30_000);
  expect(defaults.queries?.gcTime).toBe(86_400_000);
  expect(defaults.mutations?.retry).toBe(false);
});

test("reintenta hasta 2 veces sin conexión y nunca un dato inválido", () => {
  const retry = newClient().getDefaultOptions().queries?.retry as (count: number, error: AppError) => boolean;
  expect(retry(0, new AppError("offline"))).toBe(true);
  expect(retry(1, new AppError("unexpected"))).toBe(true);
  expect(retry(2, new AppError("offline"))).toBe(false);
  expect(retry(0, new AppError("invalid"))).toBe(false);
  expect(retry(0, new AppError("forbidden"))).toBe(false);
});

test("un error de una consulta llega convertido en AppError", async () => {
  const onError = jest.fn();
  const client = newClient({ onError });
  const observer = new QueryObserver(client, {
    queryKey: ["x"],
    queryFn: () => Promise.reject({ code: "P0001", message: "conflict" }),
    retry: false,
  });
  await observer.refetch();
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: "conflict" }));
});

test("una mutación refresca las claves que declara", async () => {
  const client = newClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const observer = new MutationObserver(client, {
    mutationFn: () => Promise.resolve(1),
    meta: { invalidates: [["orders"], ["stock"]] },
  });
  await observer.mutate();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["orders"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stock"] });
});

test("la señal del celular mueve onlineManager", () => {
  setupOnlineManager();
  const listener = jest.mocked(Network.addNetworkStateListener).mock.calls[0]![0];
  listener({ isConnected: false } as Network.NetworkState);
  expect(onlineManager.isOnline()).toBe(false);
  listener({ isConnected: true } as Network.NetworkState);
  expect(onlineManager.isOnline()).toBe(true);
});

test("volver a la app mueve focusManager", () => {
  const add = jest.spyOn(AppState, "addEventListener");
  setupFocusManager();
  const listener = add.mock.calls[0]![1];
  listener("background");
  expect(focusManager.isFocused()).toBe(false);
  listener("active");
  expect(focusManager.isFocused()).toBe(true);
});

test("si la app arranca sin señal, queda sin conexión aunque no llegue ningún aviso", async () => {
  jest.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({ isConnected: false } as Network.NetworkState);
  onlineManager.setOnline(true);
  setupOnlineManager();
  await Promise.resolve();
  await Promise.resolve();
  expect(onlineManager.isOnline()).toBe(false);
  onlineManager.setOnline(true);
});

test("la caché guardada dura un día y se descarta al cambiar la versión de la app", () => {
  const options = createPersistOptions("0.1.0");
  expect(options.maxAge).toBe(CACHE_MAX_AGE);
  expect(options.buster).toBe("0.1.0");
  expect(typeof options.persister.persistClient).toBe("function");
  expect(typeof options.persister.restoreClient).toBe("function");
});
