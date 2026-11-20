import { delta } from "./delta";

test("el porcentaje frente al periodo anterior y su tono (reports.md §5)", () => {
  expect(delta(348600, 311200, true)).toEqual({ text: "+12 %", tone: "good" });
  expect(delta(10600, 10000, false)).toEqual({ text: "+6 %", tone: "watch" });
  expect(delta(9000, 10000, true)).toEqual({ text: "−10 %", tone: "watch" });
  expect(delta(9000, 10000, false)).toEqual({ text: "−10 %", tone: "good" });
  expect(delta(10000, 10000, true)).toEqual({ text: "0 %", tone: "neutral" });
  // Una ganancia que pasa de negativa a positiva también sube
  expect(delta(5000, -5000, true)).toEqual({ text: "+200 %", tone: "good" });
});

test("sin datos del periodo anterior, sin comparación", () => {
  expect(delta(50000, 0, true)).toBeNull();
});
