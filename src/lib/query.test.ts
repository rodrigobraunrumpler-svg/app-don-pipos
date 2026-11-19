import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const retry = newClient().getDefaultOptions().queries?.retry as (count: number, error: unknown) => boolean;
  expect(retry(0, new AppError("offline"))).toBe(true);
  expect(retry(1, new AppError("unexpected"))).toBe(true);
  expect(retry(2, new AppError("offline"))).toBe(false);
  expect(retry(0, new AppError("invalid"))).toBe(false);
  expect(retry(0, new AppError("forbidden"))).toBe(false);
  // Lo que lanza una consulta llega sin convertir: se decide igual
  expect(retry(0, new TypeError("Network request failed"))).toBe(true);
  expect(retry(0, { code: "42501", message: "permission denied for table orders" })).toBe(false);
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
  expect(onError.mock.calls[0]![0]).toBeInstanceOf(AppError);
});

test("un error al guardar también llega al aviso general, convertido en AppError", async () => {
  const onError = jest.fn();
  const client = newClient({ onError });
  const observer = new MutationObserver(client, {
    mutationFn: () => Promise.reject({ code: "23505", message: "duplicate key value" }),
  });
  await expect(observer.mutate()).rejects.toEqual({ code: "23505", message: "duplicate key value" });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0]![0]).toBeInstanceOf(AppError);
  expect(onError.mock.calls[0]![0]).toMatchObject({ kind: "conflict" });
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

test("si el aviso de la señal llega antes que la respuesta del arranque, manda el aviso, que es más nuevo", async () => {
  let answerStartup: (state: Network.NetworkState) => void = () => undefined;
  jest.mocked(Network.getNetworkStateAsync).mockReturnValueOnce(
    new Promise((resolve) => {
      answerStartup = resolve;
    }),
  );
  onlineManager.setOnline(true);
  setupOnlineManager();
  const listener = jest.mocked(Network.addNetworkStateListener).mock.lastCall![0];
  listener({ isConnected: false } as Network.NetworkState);
  answerStartup({ isConnected: true } as Network.NetworkState);
  await Promise.resolve();
  await Promise.resolve();
  expect(onlineManager.isOnline()).toBe(false);
  onlineManager.setOnline(true);
});

test("al registrar otra vez la señal, el aviso anterior se da de baja", () => {
  setupOnlineManager();
  const first = jest.mocked(Network.addNetworkStateListener).mock.results.at(-1)!.value;
  expect(first.remove).not.toHaveBeenCalled();
  setupOnlineManager();
  expect(first.remove).toHaveBeenCalledTimes(1);
});

test("la caché guardada se escribe en el almacenamiento del celular y de ahí se vuelve a leer", async () => {
  const { persister } = createPersistOptions("0.1.0");
  const saved = { buster: "0.1.0", timestamp: 1_795_000_000_000, clientState: { mutations: [], queries: [] } };
  await persister.persistClient(saved);
  expect(await AsyncStorage.getAllKeys()).toHaveLength(1);
  await expect(persister.restoreClient()).resolves.toEqual(saved);
  await persister.removeClient();
  expect(await AsyncStorage.getAllKeys()).toHaveLength(0);
});

test("la caché guardada dura un día y se descarta al cambiar la versión de la app", () => {
  const options = createPersistOptions("0.1.0");
  expect(options.maxAge).toBe(CACHE_MAX_AGE);
  expect(options.buster).toBe("0.1.0");
  expect(typeof options.persister.persistClient).toBe("function");
  expect(typeof options.persister.restoreClient).toBe("function");
});
