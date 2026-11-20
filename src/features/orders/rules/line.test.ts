import { lineLabel } from "./line";

test("cada línea con el plural de la maqueta: una palabra suma «s», dos o más quedan igual", () => {
  expect(lineLabel(2, "Coqueta")).toBe("2 Coquetas");
  expect(lineLabel(1, "Coqueta")).toBe("1 Coqueta");
  expect(lineLabel(3, "Pipo Crush")).toBe("3 Pipo Crush");
});
