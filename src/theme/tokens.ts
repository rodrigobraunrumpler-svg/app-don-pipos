// Los colores, los radios y las letras viven en JSON: así los leen el tema (TypeScript) y tailwind.config.js (CommonJS)
import colorsJson from "./colors.json";
import scalesJson from "./scales.json";

export type ColorName = keyof typeof colorsJson.light;
export type ThemeColors = Record<ColorName, string>;

export const lightColors: ThemeColors = colorsJson.light;
export const darkColors: ThemeColors = colorsJson.dark;

export const radii = scalesJson.radii;
export const fonts = scalesJson.fonts;
