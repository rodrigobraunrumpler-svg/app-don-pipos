import { toAppError } from "./errors";
import { fetchWithTimeout } from "./fetch-timeout";

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("una petición que no responde se corta a los 20 s y llega como sin conexión", async () => {
  jest.useFakeTimers();
  // Como la red de Android: espera para siempre, salvo que la corten
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      (_input: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" })),
          ),
        ),
    );
  const request = fetchWithTimeout()("https://ejemplo.supabase.co/rest/v1/rpc/create_order");
  jest.advanceTimersByTime(19_999);
  await Promise.resolve();
  jest.advanceTimersByTime(1);
  const error = await request.catch((caught: unknown) => caught);
  expect(error).toMatchObject({ name: "AbortError" });
  expect(toAppError(error).kind).toBe("offline");
});

test("una petición que responde a tiempo pasa igual", async () => {
  const response = new Response("{}", { status: 200 });
  jest.spyOn(globalThis, "fetch").mockResolvedValue(response);
  await expect(fetchWithTimeout()("https://ejemplo.supabase.co")).resolves.toBe(response);
});

test("subir la foto de una boleta tiene 60 s: a los 20 s sigue", async () => {
  jest.useFakeTimers();
  let aborted = false;
  jest.spyOn(globalThis, "fetch").mockImplementation(
    (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        }),
      ),
  );
  const request = fetchWithTimeout()("https://ejemplo.supabase.co/storage/v1/object/receipts/a/b.jpg").catch(
    () => undefined,
  );
  jest.advanceTimersByTime(20_000);
  await Promise.resolve();
  expect(aborted).toBe(false);
  jest.advanceTimersByTime(40_000);
  await request;
  expect(aborted).toBe(true);
});
