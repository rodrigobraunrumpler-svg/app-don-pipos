import { useQueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";
import { Text } from "react-native";

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
