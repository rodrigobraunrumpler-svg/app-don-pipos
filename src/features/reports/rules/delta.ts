const NBSP = " ";
const MINUS = "−";

export type Delta = { text: string; tone: "good" | "watch" | "neutral" };

// El porcentaje frente al periodo anterior: subir es bueno en ingresos y ganancia, y ojo en gastos.
// Sin datos antes (0), no hay con qué comparar
export function delta(current: number, previous: number, upIsGood: boolean): Delta | null {
  if (previous === 0) return null;
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const sign = percent > 0 ? "+" : percent < 0 ? MINUS : "";
  const tone = percent === 0 ? "neutral" : percent > 0 === upIsGood ? "good" : "watch";
  return { text: `${sign}${Math.abs(percent)}${NBSP}%`, tone };
}
