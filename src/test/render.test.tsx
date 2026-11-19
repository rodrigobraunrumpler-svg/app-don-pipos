import { useQueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { createQueryClient, STALE_TIME } from "@/lib/query";
import { renderWithProviders } from "@/test/render";
import { useTheme } from "@/theme";

function Probe() {
  const client = useQueryClient();
  const { scheme } = useTheme();
  return <Text>{`${scheme}:${String(client.getDefaultOptions().queries?.retry)}`}</Text>;
}

test("entrega el tema pedido y un cliente de consultas sin reintentos", async () => {
  const { queryClient } = await renderWithProviders(<Probe />, { scheme: "dark" });
  expect(screen.getByText("dark:false")).toBeOnTheScreen();
  expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(Infinity);
});

test("cada llamada crea un cliente nuevo: las pruebas no comparten caché", async () => {
  const first = await renderWithProviders(<Probe />);
  const second = await renderWithProviders(<Probe />);
  expect(first.queryClient).not.toBe(second.queryClient);
});

test("el cliente de las pruebas es el de la app: solo cambian los reintentos y el temporizador de la caché", async () => {
  const { queryClient } = await renderWithProviders(<Probe />);
  const app = createQueryClient().getDefaultOptions();
  const defaults = queryClient.getDefaultOptions();
  expect(defaults.queries?.staleTime).toBe(STALE_TIME.live);
  expect(defaults.queries).toEqual({ ...app.queries, retry: false, gcTime: Infinity });
  expect(defaults.mutations).toEqual(app.mutations);
  expect(defaults.mutations?.networkMode).toBe("always");
});
