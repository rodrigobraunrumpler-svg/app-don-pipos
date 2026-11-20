import { dueDayLabel } from "./day";

// El jueves 19 de noviembre de 2026, 11:40 en Lima
const NOW = new Date("2026-11-19T16:40:00.000Z");

test("el día del pedido junto a su número: nada si es de hoy, ayer, mañana, el día de la semana o la fecha", () => {
  expect(dueDayLabel("2026-11-19", NOW)).toBe("");
  expect(dueDayLabel("2026-11-18", NOW)).toBe("ayer");
  expect(dueDayLabel("2026-11-20", NOW)).toBe("mañana");
  expect(dueDayLabel("2026-11-21", NOW)).toBe("sábado 21");
  expect(dueDayLabel("2026-11-16", NOW)).toBe("lunes 16");
  expect(dueDayLabel("2026-11-26", NOW)).toBe("26 nov");
  expect(dueDayLabel("2026-11-05", NOW)).toBe("5 nov");
});
