import { formatCents, parseSoles } from "@/lib/money";

test.each([
  [1200, "S/ 12.00"],
  [5, "S/ 0.05"],
  [0, "S/ 0.00"],
  [124550, "S/ 1,245.50"],
  [123456789, "S/ 1,234,567.89"],
  [-1800, "−S/ 18.00"],
])("formatCents(%i) es %s", (cents, text) => {
  expect(formatCents(cents)).toBe(text);
});

test.each([
  ["12", 1200],
  ["12.5", 1250],
  ["12,5", 1250],
  ["12,50", 1250],
  ["0.05", 5],
  [" 7 ", 700],
  ["12.", 1200],
  [".5", 50],
  ["0", 0],
])("parseSoles(%p) es %i", (text, cents) => {
  expect(parseSoles(text)).toBe(cents);
});

test.each(["", "   ", "abc", "-3", "12.345", "1,245.50", "1.2.3", "12a", "S/ 12", "."])(
  "parseSoles(%p) no es un monto",
  (text) => {
    expect(parseSoles(text)).toBeNull();
  },
);
