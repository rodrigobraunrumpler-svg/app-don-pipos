import { customRange, parseRangeDay, periodRange } from "./period";

// El miércoles 18 de noviembre de 2026, 10:00 en Lima
const NOW = new Date("2026-11-18T15:00:00.000Z");

test("la semana va del lunes a hoy, y la anterior son los mismos días de la semana pasada (reports.md §5)", () => {
  expect(periodRange("week", NOW)).toEqual({
    from: "2026-11-16",
    to: "2026-11-18",
    previousFrom: "2026-11-09",
    previousTo: "2026-11-11",
    label: "Del lunes 16 a hoy",
    previousLabel: "la semana pasada",
  });
  // El lunes, la semana es hoy; el día 1, el mes también
  expect(periodRange("week", new Date("2026-11-16T15:00:00.000Z")).label).toBe("Hoy");
  expect(periodRange("month", new Date("2026-11-01T15:00:00.000Z")).label).toBe("Hoy");
});

test("el mes va del 1 a hoy, y el anterior del 1 al mismo día del mes pasado", () => {
  expect(periodRange("month", NOW)).toEqual({
    from: "2026-11-01",
    to: "2026-11-18",
    previousFrom: "2026-10-01",
    previousTo: "2026-10-18",
    label: "Noviembre, hasta hoy",
    previousLabel: "octubre",
  });
  // El 31 de marzo no entra en febrero: el anterior son los 31 días justo antes
  expect(periodRange("month", new Date("2027-03-31T15:00:00.000Z"))).toMatchObject({
    previousFrom: "2027-01-29",
    previousTo: "2027-02-28",
  });
});

test("una fecha escrita es la última vez que llegó ese día", () => {
  expect(parseRangeDay("1/11", "2026-11-18")).toBe("2026-11-01");
  expect(parseRangeDay("20/12", "2026-11-18")).toBe("2025-12-20");
  expect(parseRangeDay("5-1-2026", "2026-11-18")).toBe("2026-01-05");
  expect(parseRangeDay(" 5/1/26 ", "2026-11-18")).toBe("2026-01-05");
  expect(parseRangeDay("29/2", "2026-11-18")).toBe("2024-02-29");
  expect(parseRangeDay("1/12/2026", "2026-11-18")).toBeNull();
  expect(parseRangeDay("31/2", "2026-11-18")).toBeNull();
  expect(parseRangeDay("mañana", "2026-11-18")).toBeNull();
});

test("las fechas elegidas, con los días justo anteriores para comparar", () => {
  expect(customRange("1/11", "15/11", "2026-11-18")).toEqual({
    from: "2026-11-01",
    to: "2026-11-15",
    previousFrom: "2026-10-17",
    previousTo: "2026-10-31",
    label: "Del 1 nov al 15 nov",
    previousLabel: "los 15 días anteriores",
  });
  expect(customRange("18/11", "18/11", "2026-11-18")).toMatchObject({
    previousFrom: "2026-11-17",
    previousLabel: "el día anterior",
  });
  expect(customRange("1/11", "", "2026-11-18")).toEqual({
    error: "Escribe las dos fechas como día/mes, por ejemplo 1/11.",
  });
  expect(customRange("15/11", "1/11", "2026-11-18")).toEqual({ error: "«Desde» tiene que ir antes que «Hasta»." });
  expect(customRange("1/11/2024", "1/11/2026", "2026-11-18")).toEqual({ error: "Elige hasta un año." });
});
