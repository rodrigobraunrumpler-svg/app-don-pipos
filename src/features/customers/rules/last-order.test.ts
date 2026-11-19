import { lastOrderLabel } from "./last-order";

const NOW = new Date("2026-11-18T16:40:00Z");

test("hoy, ayer o hace cuántos días, con los días de Lima", () => {
  expect(lastOrderLabel(new Date("2026-11-18T14:30:00Z"), NOW)).toBe("Hoy, 09:30");
  expect(lastOrderLabel(new Date("2026-11-17T22:00:00Z"), NOW)).toBe("Ayer");
  expect(lastOrderLabel(new Date("2026-10-15T15:00:00Z"), NOW)).toBe("Hace 34 días");
});
