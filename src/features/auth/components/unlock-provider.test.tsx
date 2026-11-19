import { screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test/render";

import { useUnlock } from "../hooks/use-unlock";
import { UnlockProvider } from "./unlock-provider";

const mockGetSession = jest.fn();
jest.mock("../api/session", () => ({
  getSession: () => mockGetSession(),
  onSessionChange: () => () => undefined,
  signOutHere: jest.fn(),
}));

function Probe() {
  const { sessionStatus, locked } = useUnlock();
  return <Text>{`${sessionStatus} ${locked ? "bloqueada" : "abierta"}`}</Text>;
}

test("con una sesión guardada, la app abre bloqueada", async () => {
  mockGetSession.mockResolvedValueOnce({ access_token: "token" });
  await renderWithProviders(
    <UnlockProvider>
      <Probe />
    </UnlockProvider>,
  );
  await waitFor(() => expect(screen.getByText("signed-in bloqueada")).toBeOnTheScreen());
});

test("sin sesión, no hay nada que desbloquear", async () => {
  mockGetSession.mockResolvedValueOnce(null);
  await renderWithProviders(
    <UnlockProvider>
      <Probe />
    </UnlockProvider>,
  );
  await waitFor(() => expect(screen.getByText("signed-out abierta")).toBeOnTheScreen());
});

test("useUnlock fuera del proveedor avisa qué falta", async () => {
  // React avisa el error por consola: aquí se espera
  const quiet = jest.spyOn(console, "error").mockImplementation(() => undefined);
  await expect(renderWithProviders(<Probe />)).rejects.toThrow("useUnlock necesita un UnlockProvider");
  quiet.mockRestore();
});
