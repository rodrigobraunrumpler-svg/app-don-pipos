import { greeting } from "./greeting";

test("el saludo cambia con la hora de Lima", () => {
  expect(greeting(new Date("2026-11-18T13:59:00.000Z"))).toBe("Buenos días"); // 08:59
  expect(greeting(new Date("2026-11-18T17:00:00.000Z"))).toBe("Buenas tardes"); // 12:00
  expect(greeting(new Date("2026-11-19T00:00:00.000Z"))).toBe("Buenas noches"); // 19:00
});
