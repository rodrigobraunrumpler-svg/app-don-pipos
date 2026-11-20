import { toCssVars } from "@/theme/css-vars";
import { darkColors, fonts, lightColors, radii } from "@/theme/tokens";

// La configuración de Tailwind es CommonJS y vive fuera de src: se carga tal cual
const tailwind = jest.requireActual("../../tailwind.config.js") as {
  theme: {
    colors: Record<string, string>;
    extend: { colors?: unknown; fontFamily: Record<string, string[]>; borderRadius: Record<string, string> };
  };
};
// La configuración ya resuelta: lo que Tailwind usa de verdad, con lo que trae por defecto y lo que agrega NativeWind
const resolveConfig = jest.requireActual("tailwindcss/resolveConfig") as (config: unknown) => {
  theme: { colors: Record<string, unknown> };
};

test("cada color se vuelve una variable --color-<nombre-en-kebab>", () => {
  const vars = toCssVars(lightColors);
  expect(Object.keys(vars)).toHaveLength(39);
  expect(vars["--color-background"]).toBe("#faf7e9");
  expect(vars["--color-text-secondary"]).toBe("#4c5743");
  expect(vars["--color-status-on-the-way-bg"]).toBe("#dff0ec");
  expect(toCssVars(darkColors)["--color-background"]).toBe("#121710");
});

test("Tailwind tiene una clase por cada color, y apunta a su variable", () => {
  const names = Object.keys(toCssVars(lightColors)).map((name) => name.replace("--color-", ""));
  expect(Object.keys(tailwind.theme.colors).sort()).toEqual([...names, "transparent", "current"].sort());
  for (const name of names) expect(tailwind.theme.colors[name]).toBe(`var(--color-${name})`);
});

test("Tailwind no conoce más colores que los del tema: bg-red-500, text-white o text-black no existen", () => {
  const palette = resolveConfig(tailwind).theme.colors;
  expect(Object.keys(palette)).toHaveLength(41); // los 39 del tema, transparent y current
  for (const name of ["white", "black", "red", "gray", "slate", "green", "blue", "inherit"])
    expect(palette[name]).toBeUndefined();
  expect(palette.transparent).toBe("transparent");
  expect(palette.current).toBe("currentColor");
  expect(palette.background).toBe("var(--color-background)");
});

test("Tailwind usa las mismas letras y los mismos radios que el tema", () => {
  expect(tailwind.theme.extend.fontFamily).toEqual(Object.fromEntries(Object.entries(fonts).map(([k, v]) => [k, [v]])));
  expect(tailwind.theme.extend.borderRadius).toEqual(
    Object.fromEntries(Object.entries(radii).map(([k, v]) => [k, `${v}px`])),
  );
});
