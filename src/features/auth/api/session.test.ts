import { getSessionState, onSessionChange, signOutHere } from "./session";

const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();
const mockHasStoredSession = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: () => ({ auth: { onAuthStateChange: mockOnAuthStateChange, signOut: mockSignOut } }),
  hasStoredSession: () => mockHasStoredSession(),
}));

test("hay sesión si hay una guardada en el celular, aunque ahora no se pueda renovar", async () => {
  mockHasStoredSession.mockResolvedValueOnce(true);
  expect(await getSessionState()).toBe("signed-in");
  mockHasStoredSession.mockResolvedValueOnce(false);
  expect(await getSessionState()).toBe("signed-out");
});

test("cada aviso de Supabase, también el inicial, hace volver a leer la sesión guardada", () => {
  let callback: (event: string, session: unknown) => void = () => undefined;
  const unsubscribe = jest.fn();
  mockOnAuthStateChange.mockImplementationOnce((handler: typeof callback) => {
    callback = handler;
    return { data: { subscription: { unsubscribe } } };
  });
  const listener = jest.fn();
  const stop = onSessionChange(listener);
  callback("INITIAL_SESSION", null);
  callback("TOKEN_REFRESHED", { access_token: "a" });
  callback("SIGNED_OUT", null);
  expect(listener.mock.calls).toEqual([[], [], []]);
  stop();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test("sin señal, cerrar la sesión termina igual si el celular ya la borró", async () => {
  mockSignOut.mockResolvedValueOnce({
    error: Object.assign(new Error("fetch failed"), { name: "AuthRetryableFetchError" }),
  });
  mockHasStoredSession.mockResolvedValueOnce(false);
  await expect(signOutHere()).resolves.toBeUndefined();
});

test("si la sesión sigue guardada, cerrar la sesión avisa el error", async () => {
  mockSignOut.mockResolvedValueOnce({ error: null });
  mockHasStoredSession.mockResolvedValueOnce(true);
  await expect(signOutHere()).rejects.toMatchObject({ kind: "unexpected" });
});
