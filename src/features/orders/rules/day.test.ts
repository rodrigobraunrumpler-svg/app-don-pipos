import { dueDayLabel, parseDayMonth } from "./day";

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

test("otra fecha escrita como día/mes: la próxima vez que llega, nunca una pasada", () => {
  expect(parseDayMonth("24/12", "2026-11-19")).toBe("2026-12-24");
  expect(parseDayMonth(" 5-1 ", "2026-11-19")).toBe("2027-01-05");
  expect(parseDayMonth("19.11", "2026-11-19")).toBe("2026-11-19");
  expect(parseDayMonth("24/12/2027", "2026-11-19")).toBe("2027-12-24");
  expect(parseDayMonth("1/3/27", "2026-11-19")).toBe("2027-03-01");
  expect(parseDayMonth("29/2", "2026-11-19")).toBe("2028-02-29");
  for (const text of ["", "31/2", "0/5", "12", "abc", "1/1/2026", "29/2/2027", "32/1"])
    expect(parseDayMonth(text, "2026-11-19")).toBeNull();
});
