import { QueryClient } from "@tanstack/react-query";

import { followSessionChanges, sessionQuery } from "./session";

let mockListener: ((session: unknown) => void) | undefined;
jest.mock("../api/session", () => ({
  getSession: jest.fn(async () => null),
  onSessionChange: (listener: (session: unknown) => void) => {
    mockListener = listener;
    return () => {
      mockListener = undefined;
    };
  },
  signOutHere: jest.fn(),
}));

test("la sesión nunca va a la caché guardada en el celular", () => {
  expect(sessionQuery.meta).toEqual({ persist: false });
  expect(sessionQuery.staleTime).toBe(Infinity);
});

test("cuando la sesión se cierra, la caché queda en null; y se deja de escuchar", () => {
  const client = new QueryClient();
  client.setQueryData(sessionQuery.queryKey, { access_token: "token" } as never);
  const stop = followSessionChanges(client);
  mockListener?.(null);
  expect(client.getQueryData(sessionQuery.queryKey)).toBeNull();
  stop();
  expect(mockListener).toBeUndefined();
});
