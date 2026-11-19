import AsyncStorage from "@react-native-async-storage/async-storage";
import { dehydrate, focusManager, MutationObserver, onlineManager, QueryObserver } from "@tanstack/react-query";
import { persistQueryClientRestore, persistQueryClientSave } from "@tanstack/react-query-persist-client";
import * as Network from "expo-network";
import { AppState } from "react-native";

import { AppError } from "@/lib/errors";
import {
  CACHE_MAX_AGE,
  CACHE_SCHEMA,
  CACHE_STORAGE_KEY,
  createPersistOptions,
  createQueryClient,
  forgetCachedData,
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

// Guardar sin señal y enviar después queda para más adelante (PROJECT_CONTEXT.md §14.2): por ahora falla y avisa
test("sin señal, un guardado no queda en espera: se intenta, falla al momento y avisa «sin conexión»", async () => {
  const onError = jest.fn();
  const client = newClient({ onError });
  onlineManager.setOnline(false);
  const mutationFn = jest.fn(() => Promise.reject(new TypeError("Network request failed")));
  const observer = new MutationObserver(client, { mutationFn });
  const outcome = await Promise.race([
    observer.mutate().then(
      () => "guardado",
      () => "falló",
    ),
    new Promise((resolve) => setTimeout(() => resolve("sigue esperando"), 50)),
  ]);
  onlineManager.setOnline(true);
  expect(outcome).toBe("falló");
  expect(mutationFn).toHaveBeenCalledTimes(1);
  expect(observer.getCurrentResult()).toMatchObject({ status: "error", isPaused: false });
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: "offline" }));
  expect(client.getDefaultOptions().mutations?.networkMode).toBe("always");
});

test("lo que se estaba guardando nunca se escribe en la caché del celular, ni aunque quede en espera", async () => {
  const client = newClient();
  const options = createPersistOptions("0.1.0");
  onlineManager.setOnline(false);
  // Una mutación que pide esperar la señal, a propósito: es el único caso en que TanStack Query la guardaría
  const observer = new MutationObserver(client, {
    networkMode: "online",
    mutationFn: (customer: { phone: string }) => Promise.resolve(customer),
  });
  void observer.mutate({ phone: "DEMO 900 000 001" });
  await Promise.resolve();
  expect(observer.getCurrentResult().isPaused).toBe(true);

  await persistQueryClientSave({ queryClient: client, ...options });
  onlineManager.setOnline(true);
  const stored = await AsyncStorage.getItem((await AsyncStorage.getAllKeys())[0]!);
  await options.persister.removeClient();
  expect(JSON.parse(stored!).clientState.mutations).toEqual([]);
  expect(stored).not.toContain("DEMO 900 000 001");
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

test("al cerrar la sesión se borra la caché, también la guardada en el celular; la sesión se queda", async () => {
  const client = newClient();
  client.setQueryData(["pedidos"], [1, 2]);
  client.setQueryData(["auth", "session"], "signed-in");
  await AsyncStorage.setItem(CACHE_STORAGE_KEY, "{}");
  await forgetCachedData(client, ["auth", "session"]);
  expect(client.getQueryData(["pedidos"])).toBeUndefined();
  expect(client.getQueryData(["auth", "session"])).toBe("signed-in");
  expect(await AsyncStorage.getItem(CACHE_STORAGE_KEY)).toBeNull();
});

test("la caché guardada se escribe en el almacenamiento del celular y de ahí se vuelve a leer", async () => {
  const { persister } = createPersistOptions("0.1.0");
  const saved = { buster: "0.1.0", timestamp: 1_795_000_000_000, clientState: { mutations: [], queries: [] } };
  await persister.persistClient(saved);
  expect(await AsyncStorage.getAllKeys()).toEqual([CACHE_STORAGE_KEY]);
  await expect(persister.restoreClient()).resolves.toEqual(saved);
  await persister.removeClient();
  expect(await AsyncStorage.getAllKeys()).toHaveLength(0);
});

test("la caché guardada dura un día y se descarta al cambiar la versión de la app o el número de esquema", () => {
  const options = createPersistOptions("0.1.0");
  expect(options.maxAge).toBe(CACHE_MAX_AGE);
  expect(Number.isInteger(CACHE_SCHEMA) && CACHE_SCHEMA >= 1).toBe(true);
  expect(options.buster).toBe(`0.1.0-${CACHE_SCHEMA}`);
  expect(createPersistOptions("0.2.0").buster).toBe(`0.2.0-${CACHE_SCHEMA}`);
  expect(typeof options.persister.persistClient).toBe("function");
  expect(typeof options.persister.restoreClient).toBe("function");
});

test("lo guardado con otro número de esquema no se vuelve a cargar: se borra", async () => {
  const options = createPersistOptions("0.1.0");
  const writer = newClient();
  writer.setQueryData(["orders", "list"], [{ id: "1", totalCents: 4100 }]);
  // La misma versión de la app (así pasa durante el desarrollo y con EAS Update), pero con el esquema anterior
  await persistQueryClientSave({ queryClient: writer, ...options, buster: `0.1.0-${CACHE_SCHEMA - 1}` });
  expect(await AsyncStorage.getAllKeys()).toHaveLength(1);

  const reader = newClient();
  await persistQueryClientRestore({ queryClient: reader, ...options });
  expect(reader.getQueryData(["orders", "list"])).toBeUndefined();
  expect(await AsyncStorage.getAllKeys()).toHaveLength(0);
});

test("con el mismo esquema, lo guardado se vuelve a cargar al abrir", async () => {
  const options = createPersistOptions("0.1.0");
  const writer = newClient();
  writer.setQueryData(["orders", "list"], [{ id: "1", totalCents: 4100 }]);
  await persistQueryClientSave({ queryClient: writer, ...options });

  const reader = newClient();
  await persistQueryClientRestore({ queryClient: reader, ...options });
  await options.persister.removeClient();
  expect(reader.getQueryData(["orders", "list"])).toEqual([{ id: "1", totalCents: 4100 }]);
});

test("solo se guarda lo que cargó bien, no pasó de un día y no pidió quedar fuera", async () => {
  const { dehydrateOptions } = createPersistOptions("0.1.0");
  const client = newClient();
  const now = Date.now();
  client.setQueryData(["fresh"], "ok");
  client.setQueryData(["almost-a-day-old"], "ok", { updatedAt: now - CACHE_MAX_AGE + 60_000 });
  client.setQueryData(["older-than-a-day"], "ok", { updatedAt: now - CACHE_MAX_AGE - 60_000 });
  await client.prefetchQuery({ queryKey: ["failed"], queryFn: () => Promise.reject(new AppError("forbidden")) });
  client.getQueryCache().build(client, { queryKey: ["loading"] }); // todavía sin datos
  await client.prefetchQuery({ queryKey: ["opted-out"], queryFn: () => "secreto", meta: { persist: false } });
  await client.prefetchQuery({ queryKey: ["opted-in"], queryFn: () => "ok", meta: { persist: true } });
  expect(client.getQueryState(["failed"])?.status).toBe("error");
  expect(client.getQueryState(["loading"])?.status).toBe("pending");
  expect(client.getQueryData(["opted-out"])).toBe("secreto");

  const saved = dehydrate(client, dehydrateOptions).queries.map((query) => query.queryKey.join());
  expect(saved.sort()).toEqual(["almost-a-day-old", "fresh", "opted-in"]);
});
