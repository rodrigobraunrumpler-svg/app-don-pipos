import { parseSoles } from "@/lib/money";

// Un precio escrito por el dueño: «12,50» → 1250. El 0 y lo que no es un monto no sirven
export function parsePrice(text: string): number | null {
  const cents = parseSoles(text);
  return cents !== null && cents > 0 ? cents : null;
}
