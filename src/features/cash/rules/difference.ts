import { formatCents } from "@/lib/money";

type Difference = { tone: "ok" | "short" | "over"; title: string; hint: string };

// La vista previa del cuadre mientras se escribe (docs/spec/cash.md §5); al cerrar, la cuenta la hace la base.
// Debería haber: con cuánto abrió + lo cobrado en efectivo − lo gastado en efectivo
export function expectedCash(openingCents: number, cashInCents: number, cashOutCents: number): number {
  return openingCents + cashInCents - cashOutCents;
}

// Lo contado frente a lo que debería haber, con la pista de la maqueta
export function cashDifference(countedCents: number, expectedCents: number): Difference {
  const difference = countedCents - expectedCents;
  if (difference === 0) return { tone: "ok", title: "La caja cuadra.", hint: "Todo el efectivo está." };
  if (difference < 0)
    return {
      tone: "short",
      title: `Faltan ${formatCents(-difference)}.`,
      hint: "Revisa si falta anotar un gasto o un vuelto.",
    };
  return { tone: "over", title: `Sobran ${formatCents(difference)}.`, hint: "Revisa si falta anotar una venta." };
}

// «Día cerrado»: cómo quedó el último conteo
export function closedText(count: { expectedCents: number; differenceCents: number }): string {
  if (count.differenceCents === 0) return `La caja cuadró: ${formatCents(count.expectedCents)} en efectivo.`;
  return count.differenceCents < 0
    ? `Faltaron ${formatCents(-count.differenceCents)}. Quedó anotado.`
    : `Sobraron ${formatCents(count.differenceCents)}. Quedó anotado.`;
}
