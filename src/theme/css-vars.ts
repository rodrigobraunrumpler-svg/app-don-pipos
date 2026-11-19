import type { ThemeColors } from "./tokens";

const kebab = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

// «textSecondary» → «--color-text-secondary»: el nombre con el que Tailwind lee cada color (tailwind.config.js)
export function toCssVars(colors: ThemeColors): Record<string, string> {
  return Object.fromEntries(Object.entries(colors).map(([name, value]) => [`--color-${kebab(name)}`, value]));
}
