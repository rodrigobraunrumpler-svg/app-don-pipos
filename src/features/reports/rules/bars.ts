import { formatMonth, formatWeekday } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import type { Bar } from "../schema/report";
import { capitalize, dayOfMonth, daysBetween, noon } from "./day";

export type BarUnit = "day" | "week" | "month";

// Como report_summary: por día hasta 7 días, por semana hasta 62 y por mes en un rango más largo
export function barUnit(from: string, to: string): BarUnit {
  const days = daysBetween(from, to) + 1;
  return days <= 7 ? "day" : days <= 62 ? "week" : "month";
}

const dayMonth = (date: string): string => `${dayOfMonth(date)}/${Number(date.slice(5, 7))}`;

// «1 al 7», «15 a hoy», «29/10 al 4/11»
function span({ from, to }: Bar, today: string): string {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const start = sameMonth ? String(dayOfMonth(from)) : dayMonth(from);
  if (to === today) return `${start} a hoy`;
  return `${start} al ${sameMonth ? dayOfMonth(to) : dayMonth(to)}`;
}

const isToday = (bar: Bar, today: string): boolean => bar.from === today && bar.to === today;

// El nombre debajo de cada barra: «Lun» u «Hoy», «1 al 7», «Oct»
export function barLabel(bar: Bar, unit: BarUnit, today: string): string {
  if (unit === "month") return capitalize(formatMonth(noon(bar.from)).slice(0, 3));
  if (isToday(bar, today)) return "Hoy";
  if (unit === "day") return formatWeekday(noon(bar.from)).slice(0, 3);
  if (bar.from === bar.to) return String(dayOfMonth(bar.from));
  return span(bar, today);
}

function barName(bar: Bar, unit: BarUnit, today: string): string {
  if (unit === "month") return `En ${formatMonth(noon(bar.from))}`;
  if (isToday(bar, today)) return "Hoy";
  if (unit === "day") return `El ${formatWeekday(noon(bar.from)).toLowerCase()}`;
  if (bar.from === bar.to) return `El ${dayOfMonth(bar.from)}`;
  return `Del ${span(bar, today)}`;
}

// El texto de la barra tocada: «Del 1 al 7 entró S/ 1,180.00 y salió S/ 410.00.»
export function barText(bar: Bar, unit: BarUnit, today: string): string {
  return `${barName(bar, unit, today)} entró ${formatCents(bar.incomeCents)} y salió ${formatCents(bar.expensesCents)}.`;
}
