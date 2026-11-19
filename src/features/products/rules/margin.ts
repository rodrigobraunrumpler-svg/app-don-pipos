import { formatCents } from "@/lib/money";

const NBSP = " ";

// La ganancia por alfajor: el precio menos el costo. Sin costo, no hay dato
export function margin(priceCents: number, costCents: number | null): { cents: number; percent: number } | null {
  if (costCents === null) return null;
  const cents = priceCents - costCents;
  return { cents, percent: Math.round((cents / priceCents) * 1000) / 10 };
}

export function marginLabel({ cents, percent }: { cents: number; percent: number }): string {
  if (cents < 0) return `Pierdes ${formatCents(-cents)} por alfajor`;
  return `Ganas ${formatCents(cents)} por alfajor (${String(percent).replace(".", ",")}${NBSP}%)`;
}
