import { margin, marginLabel } from "./margin";

const NBSP = " ";

test("1200 − 510 → 690, un 57,5 %", () => expect(margin(1200, 510)).toEqual({ cents: 690, percent: 57.5 }));
test("sin costo, no hay dato", () => expect(margin(1200, null)).toBeNull());
test("el texto de la ganancia", () =>
  expect(marginLabel({ cents: 690, percent: 57.5 })).toBe(`Ganas S/${NBSP}6.90 por alfajor (57,5${NBSP}%)`));
test("con un porcentaje entero, sin decimales", () =>
  expect(marginLabel(margin(1200, 600)!)).toBe(`Ganas S/${NBSP}6.00 por alfajor (50${NBSP}%)`));
test("si cuesta más de lo que vale", () =>
  expect(marginLabel(margin(1000, 1200)!)).toBe(`Pierdes S/${NBSP}2.00 por alfajor`));
