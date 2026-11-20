import { darkColors, lightColors, radii } from "@/theme/tokens";

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const PAIRS = [
  ["text", "background"],
  ["text", "surface"],
  ["text", "sunken"],
  ["textSecondary", "background"],
  ["textSecondary", "surface"],
  ["textMuted", "background"],
  ["textMuted", "surface"],
  ["onPrimary", "primary"],
  ["onPrimary", "brand"],
  ["accent", "background"],
  ["accent", "surface"],
  ["danger", "background"],
  ["danger", "surface"],
  ["danger", "dangerSoft"],
  ["warning", "warningSoft"],
  ["caramelText", "caramelSoft"],
  ["olive", "surface"],
  ["statusNewText", "statusNewBg"],
  ["statusPreparingText", "statusPreparingBg"],
  ["statusOnTheWayText", "statusOnTheWayBg"],
  ["statusReadyText", "statusReadyBg"],
  ["statusDeliveredText", "statusDeliveredBg"],
  ["statusCancelledText", "statusCancelledBg"],
] as const;

test("claro y oscuro tienen los mismos 39 colores, todos en #rrggbb", () => {
  expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  expect(Object.keys(lightColors)).toHaveLength(39);
  for (const value of [...Object.values(lightColors), ...Object.values(darkColors)])
    expect(value).toMatch(/^#[0-9a-f]{6}$/);
});

test("los colores son los de la maqueta", () => {
  expect(lightColors.primary).toBe("#354b2e");
  expect(lightColors.background).toBe("#faf7e9");
  expect(darkColors.background).toBe("#121710");
  expect(darkColors.accent).toBe("#a8cb94");
  expect(darkColors.brand).toBe("#2b3f25");
  expect(radii).toEqual({ sm: 12, md: 16, lg: 20, xl: 26 });
});

test.each(PAIRS)("%s sobre %s se lee en claro y en oscuro (contraste de 4.5 o más)", (fg, bg) => {
  expect(contrast(lightColors[fg], lightColors[bg])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(darkColors[fg], darkColors[bg])).toBeGreaterThanOrEqual(4.5);
});
