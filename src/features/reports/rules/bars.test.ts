import { barLabel, barText, barUnit } from "./bars";

const bar = (from: string, to: string) => ({ from, to, incomeCents: 118000, expensesCents: 41000 });
const TODAY = "2026-11-18";

test("las barras van por día hasta 7 días, por semana hasta 62 y por mes en un rango más largo", () => {
  expect(barUnit("2026-11-16", "2026-11-18")).toBe("day");
  expect(barUnit("2026-11-01", "2026-11-18")).toBe("week");
  expect(barUnit("2026-09-01", "2026-11-18")).toBe("month");
});

test("el nombre debajo de cada barra", () => {
  expect(barLabel(bar("2026-11-16", "2026-11-16"), "day", TODAY)).toBe("Lun");
  expect(barLabel(bar("2026-11-18", "2026-11-18"), "day", TODAY)).toBe("Hoy");
  expect(barLabel(bar("2026-11-01", "2026-11-07"), "week", TODAY)).toBe("1 al 7");
  expect(barLabel(bar("2026-11-15", "2026-11-18"), "week", TODAY)).toBe("15 a hoy");
  expect(barLabel(bar("2026-10-29", "2026-11-04"), "week", TODAY)).toBe("29/10 al 4/11");
  expect(barLabel(bar("2026-10-01", "2026-10-31"), "month", TODAY)).toBe("Oct");
});

test("el texto de la barra tocada (reports.md §5)", () => {
  expect(barText(bar("2026-11-01", "2026-11-07"), "week", TODAY)).toBe(
    "Del 1 al 7 entró S/ 1,180.00 y salió S/ 410.00.",
  );
  expect(barText(bar("2026-11-16", "2026-11-16"), "day", TODAY)).toBe("El lunes entró S/ 1,180.00 y salió S/ 410.00.");
  expect(barText(bar("2026-11-18", "2026-11-18"), "day", TODAY)).toBe("Hoy entró S/ 1,180.00 y salió S/ 410.00.");
  expect(barText(bar("2026-10-01", "2026-10-31"), "month", TODAY)).toBe(
    "En octubre entró S/ 1,180.00 y salió S/ 410.00.",
  );
});

test("la última semana de un rango puede ser de un solo día", () => {
  expect(barLabel(bar("2026-10-29", "2026-10-29"), "week", TODAY)).toBe("29");
  expect(barText(bar("2026-10-29", "2026-10-29"), "week", TODAY)).toMatch(/^El 29 entró/);
  expect(barLabel(bar("2026-11-18", "2026-11-18"), "week", TODAY)).toBe("Hoy");
});
