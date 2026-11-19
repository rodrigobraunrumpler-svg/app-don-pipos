import { changePin, signInWithPin } from "./pin";

const mockInvoke = jest.fn();
const mockSetSession = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: () => ({ functions: { invoke: mockInvoke }, auth: { setSession: mockSetSession } }),
}));

const respond = (data: unknown, error: unknown = null) => mockInvoke.mockResolvedValueOnce({ data, error });

test("si el PIN es correcto, guarda la sesión con los dos tokens", async () => {
  respond({ status: "ok", session: { accessToken: "token-a", refreshToken: "token-r", expiresAt: 1763600000 } });
  mockSetSession.mockResolvedValueOnce({ data: {}, error: null });
  await expect(signInWithPin("900000901", "197346")).resolves.toEqual({ status: "ok" });
  expect(mockInvoke).toHaveBeenLastCalledWith("sign-in-with-pin", { body: { phone: "900000901", pin: "197346" } });
  expect(mockSetSession).toHaveBeenLastCalledWith({ access_token: "token-a", refresh_token: "token-r" });
});

test("con un PIN equivocado no guarda nada", async () => {
  mockSetSession.mockClear();
  respond({ status: "wrong_pin", attemptsLeft: 3 });
  await expect(signInWithPin("900000901", "000001")).resolves.toEqual({ status: "wrong_pin", attemptsLeft: 3 });
  expect(mockSetSession).not.toHaveBeenCalled();
});

test("la espera trae la hora a la que se puede volver a intentar", async () => {
  respond({ status: "locked", retryAt: "2026-11-19T16:55:00.000Z" });
  await expect(signInWithPin("900000901", "000001")).resolves.toEqual({
    status: "locked",
    retryAt: new Date("2026-11-19T16:55:00.000Z"),
  });
});

test("una respuesta con otra forma es un error inesperado", async () => {
  respond({ estado: "ok" });
  await expect(signInWithPin("900000901", "197346")).rejects.toMatchObject({ kind: "unexpected" });
});

test("sin señal, el error es offline", async () => {
  respond(
    null,
    Object.assign(new Error("Failed to send a request to the Edge Function"), { name: "FunctionsFetchError" }),
  );
  await expect(signInWithPin("900000901", "197346")).rejects.toMatchObject({ kind: "offline" });
});

test("cambiar el PIN devuelve lo que dijo el servidor", async () => {
  respond({ status: "obvious_pin" });
  await expect(changePin("197346", "123456")).resolves.toEqual({ status: "obvious_pin" });
  expect(mockInvoke).toHaveBeenLastCalledWith("change-pin", { body: { current: "197346", next: "123456" } });
  respond({ status: "same_pin" });
  await expect(changePin("197346", "197346")).resolves.toEqual({ status: "same_pin" });
});
