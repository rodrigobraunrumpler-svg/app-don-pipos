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
