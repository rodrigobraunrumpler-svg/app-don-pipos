import { toCssVars } from "@/theme/css-vars";
import { darkColors, fonts, lightColors, radii } from "@/theme/tokens";

// La configuración de Tailwind es CommonJS y vive fuera de src: se carga tal cual
const tailwind = jest.requireActual("../../tailwind.config.js") as {
  theme: {
    extend: {
      colors: Record<string, string>;
      fontFamily: Record<string, string[]>;
      borderRadius: Record<string, string>;
    };
  };
};

test("cada color se vuelve una variable --color-<nombre-en-kebab>", () => {
  const vars = toCssVars(lightColors);
  expect(Object.keys(vars)).toHaveLength(35);
  expect(vars["--color-background"]).toBe("#faf7e9");
  expect(vars["--color-text-secondary"]).toBe("#4c5743");
  expect(vars["--color-status-on-the-way-bg"]).toBe("#dff0ec");
  expect(toCssVars(darkColors)["--color-background"]).toBe("#121710");
});

test("Tailwind tiene una clase por cada color, y apunta a su variable", () => {
  const names = Object.keys(toCssVars(lightColors)).map((name) => name.replace("--color-", ""));
  expect(Object.keys(tailwind.theme.extend.colors).sort()).toEqual([...names].sort());
  for (const name of names) expect(tailwind.theme.extend.colors[name]).toBe(`var(--color-${name})`);
});

test("Tailwind usa las mismas letras y los mismos radios que el tema", () => {
  expect(tailwind.theme.extend.fontFamily).toEqual(Object.fromEntries(Object.entries(fonts).map(([k, v]) => [k, [v]])));
  expect(tailwind.theme.extend.borderRadius).toEqual(
    Object.fromEntries(Object.entries(radii).map(([k, v]) => [k, `${v}px`])),
  );
});
