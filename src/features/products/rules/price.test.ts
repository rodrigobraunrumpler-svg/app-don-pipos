import { parsePrice } from "./price";

test.each([
  ["12,5", 1250],
  ["12.50", 1250],
  ["13", 1300],
  [" 9,90 ", 990],
])("«%s» es %i céntimos", (text, cents) => expect(parsePrice(text)).toBe(cents));

test.each(["0", "0,00", "-5", "abc", "12,345", "", "  "])("«%s» no es un precio", (text) =>
  expect(parsePrice(text)).toBeNull(),
);
