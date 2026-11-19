import { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";

import { getSessionState } from "../api/session";
import { followSessionChanges, sessionQuery } from "./session";

let mockListener: (() => void) | undefined;
jest.mock("../api/session", () => ({
  getSessionState: jest.fn(),
  onSessionChange: (listener: () => void) => {
    mockListener = listener;
    return () => {
      mockListener = undefined;
    };
  },
  signOutHere: jest.fn(),
}));

test("la sesión nunca va a la caché guardada, y se lee aunque no haya señal", () => {
  expect(sessionQuery.meta).toEqual({ persist: false });
  expect(sessionQuery.staleTime).toBe(Infinity);
  expect(sessionQuery.networkMode).toBe("always");
});

test("cada cambio de sesión la vuelve a leer del celular; y se deja de escuchar", async () => {
  jest.mocked(getSessionState).mockResolvedValueOnce("signed-in").mockResolvedValueOnce("signed-out");
  const client = new QueryClient();
  await client.fetchQuery(sessionQuery);
  const stop = followSessionChanges(client);
  mockListener?.();
  await waitFor(() => expect(client.getQueryData(sessionQuery.queryKey)).toBe("signed-out"));
  stop();
  expect(mockListener).toBeUndefined();
});
