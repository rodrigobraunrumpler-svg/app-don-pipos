import { loadedWhen } from "./loaded";

// El miércoles 18 de noviembre de 2026, 10:00 en Lima
const NOW = new Date("2026-11-18T15:00:00.000Z");

test("de cuándo es lo que se ve sin señal: hoy la hora, si no también el día", () => {
  expect(loadedWhen(new Date("2026-11-18T14:32:00.000Z"), NOW)).toBe("a las 09:32");
  expect(loadedWhen(new Date("2026-11-17T23:40:00.000Z"), NOW)).toBe("ayer a las 18:40");
  expect(loadedWhen(new Date("2026-11-09T23:40:00.000Z"), NOW)).toBe("el 9 nov a las 18:40");
});
