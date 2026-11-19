import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text, useColorScheme } from "react-native";

import { darkColors, lightColors, ThemeProvider, useTheme } from "@/theme";
import { toCssVars } from "@/theme/css-vars";

// En el celular, NativeWind guarda las variables en una tabla suya; aquí quedan a la vista en el estilo, para comprobarlas
jest.mock("nativewind", () => ({ vars: (variables: Record<string, string>) => variables }));

const rootStyle = () => StyleSheet.flatten(screen.getByTestId("theme-root").props.style);

// En las pruebas, el celular está en modo claro salvo que la prueba diga otra cosa
afterEach(() => jest.mocked(useColorScheme).mockReturnValue("light"));

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

test("sin forzar y con el celular en modo oscuro, entrega los colores oscuros", async () => {
  jest.mocked(useColorScheme).mockReturnValue("dark");
  await render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  expect(screen.getByText(`dark:${darkColors.background}`)).toBeOnTheScreen();
  expect(rootStyle()).toMatchObject(toCssVars(darkColors));
});

test("las clases reciben las variables del modo que toca: las oscuras en oscuro y las claras en claro", async () => {
  const dark = await render(
    <ThemeProvider forcedScheme="dark">
      <Probe />
    </ThemeProvider>,
  );
  expect(rootStyle()).toMatchObject(toCssVars(darkColors));
  expect(rootStyle()["--color-background"]).toBe("#121710");
  await dark.unmount();

  await render(
    <ThemeProvider forcedScheme="light">
      <Probe />
    </ThemeProvider>,
  );
  expect(rootStyle()).toMatchObject(toCssVars(lightColors));
  expect(rootStyle()["--color-background"]).toBe("#faf7e9");
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
  expect(rootStyle()).toMatchObject({ flex: 1 });
});
