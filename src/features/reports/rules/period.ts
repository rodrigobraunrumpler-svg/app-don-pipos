import { addDays, businessDate, formatMonth, formatShortDate } from "@/lib/dates";

import { capitalize, dayOfMonth, daysBetween, isDay, noon } from "./day";

export type PeriodKind = "week" | "month";
export type Period = {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  label: string;
  previousLabel: string;
};

// Como report_summary: hasta un año
const MAX_DAYS = 366;
// «1/11», «1-11», «5/1/2026» o «5/1/26»
const DAY_TEXT = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/;
// Para «29/2»: la última vez que llegó puede ser hasta 8 años atrás
const YEARS_BACK = 8;

// Los mismos días justo antes del periodo
function daysBefore(from: string, to: string): Pick<Period, "previousFrom" | "previousTo" | "previousLabel"> {
  const days = daysBetween(from, to) + 1;
  return {
    previousFrom: addDays(from, -days),
    previousTo: addDays(from, -1),
    previousLabel: days === 1 ? "el día anterior" : `los ${days} días anteriores`,
  };
}

// La semana va del lunes a hoy y se compara con los mismos días de la semana pasada; el mes, del 1 a hoy, con los
// mismos días del mes pasado (reports.md §5). Si ese día no existe en el mes pasado (31 de marzo), con los días justo antes
export function periodRange(kind: PeriodKind, now: Date): Period {
  const to = businessDate(now);
  if (kind === "week") {
    const from = addDays(to, -((noon(to).getUTCDay() + 6) % 7));
    return {
      from,
      to,
      previousFrom: addDays(from, -7),
      previousTo: addDays(to, -7),
      label: from === to ? "Hoy" : `Del lunes ${dayOfMonth(from)} a hoy`,
      previousLabel: "la semana pasada",
    };
  }
  const from = `${to.slice(0, 8)}01`;
  const label = from === to ? "Hoy" : `${capitalize(formatMonth(now))}, hasta hoy`;
  const previousFrom = `${addDays(from, -1).slice(0, 8)}01`;
  const previousTo = `${previousFrom.slice(0, 8)}${to.slice(8)}`;
  if (!isDay(previousTo)) return { from, to, label, ...daysBefore(from, to) };
  return { from, to, previousFrom, previousTo, label, previousLabel: formatMonth(noon(previousFrom)) };
}

// El mes pasado entero, para exportar: «Octubre», del 1 al 31
export function lastMonthRange(now: Date): { from: string; to: string; label: string } {
  const to = addDays(`${businessDate(now).slice(0, 8)}01`, -1);
  return { from: `${to.slice(0, 8)}01`, to, label: capitalize(formatMonth(noon(to))) };
}

// Una fecha escrita como día/mes: la última vez que llegó ese día (hasta hoy). Con el año, ese día si ya pasó
export function parseRangeDay(text: string, today: string): string | null {
  const match = DAY_TEXT.exec(text.trim());
  if (!match) return null;
  const day = match[1]!;
  const month = match[2]!;
  const year = match[3];
  const thisYear = Number(today.slice(0, 4));
  const years = year
    ? [Number(year.length === 2 ? `20${year}` : year)]
    : Array.from({ length: YEARS_BACK + 1 }, (_, back) => thisYear - back);
  return (
    years
      .map((candidate) => `${candidate}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
      .find((date) => isDay(date) && date <= today) ?? null
  );
}

// «Elegir fechas»: Desde y Hasta escritos, hasta un año, comparados con los mismos días justo antes
export function customRange(fromText: string, toText: string, today: string): Period | { error: string } {
  const from = parseRangeDay(fromText, today);
  const to = parseRangeDay(toText, today);
  if (!from || !to) return { error: "Escribe las dos fechas como día/mes, por ejemplo 1/11." };
  if (from > to) return { error: "«Desde» tiene que ir antes que «Hasta»." };
  if (daysBetween(from, to) + 1 > MAX_DAYS) return { error: "Elige hasta un año." };
  return {
    from,
    to,
    label: `Del ${formatShortDate(noon(from))} al ${formatShortDate(noon(to))}`,
    ...daysBefore(from, to),
  };
}
