import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { darkColors, lightColors, ThemeProvider, useTheme } from "@/theme";

function Probe() {
  const { scheme, colors } = useTheme();
  return <Text>{`${scheme}:${colors.background}`}</Text>;
}

test("forzado a oscuro, entrega los colores oscuros", async () => {
  await render(
    <ThemeProvider forcedScheme="dark">
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(`dark:${darkColors.background}`)).toBeOnTheScreen();
});

test("sin forzar, sigue el modo del celular (claro en las pruebas)", async () => {
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(`light:${lightColors.background}`)).toBeOnTheScreen();
});

test("useTheme fuera del ThemeProvider avisa con un error claro", async () => {
  const quiet = jest.spyOn(console, "error").mockImplementation(() => undefined); // React también lo registra en consola
  await expect(render(<Probe />)).rejects.toThrow("useTheme necesita un ThemeProvider");
  quiet.mockRestore();
});

test("el contenedor del tema ocupa toda la pantalla", async () => {
  await render(
    <ThemeProvider forcedScheme="light">
      <Probe />
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId("theme-root").props.style)).toMatchObject({ flex: 1 });
});
