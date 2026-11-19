import { businessDate, businessDayRange, formatLongDate, formatTime, TIME_ZONE } from "@/lib/dates";

test("la zona es la de Lima", () => {
  expect(TIME_ZONE).toBe("America/Lima");
});

test("a las 23:59 de Lima sigue siendo el mismo día; a las 00:00 ya es el siguiente", () => {
  expect(businessDate(new Date("2026-11-19T04:59:59Z"))).toBe("2026-11-18");
  expect(businessDate(new Date("2026-11-19T05:00:00Z"))).toBe("2026-11-19");
});

test("el día va de las 00:00 de Lima a las 00:00 del día siguiente", () => {
  const { from, to } = businessDayRange("2026-11-18");
  expect(from.toISOString()).toBe("2026-11-18T05:00:00.000Z");
  expect(to.toISOString()).toBe("2026-11-19T05:00:00.000Z");
});

test("las fechas se escriben en español de Perú", () => {
  const instant = new Date("2026-11-18T16:40:00Z");
  expect(formatLongDate(instant)).toBe("Miércoles 18 de noviembre");
  expect(formatTime(instant)).toBe("11:40");
});
