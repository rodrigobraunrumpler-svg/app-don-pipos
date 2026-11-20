import { businessDayRange } from "@/lib/dates";

const DAY_MS = 86_400_000;

// El mediodía de Lima de un día, para nombrarlo con las funciones de lib/dates
export const noon = (date: string): Date => new Date(`${date}T12:00:00-05:00`);

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

export const dayOfMonth = (date: string): number => Number(date.slice(8));

export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// ¿Existe ese día? «2026-02-31» no
export function isDay(date: string): boolean {
  try {
    businessDayRange(date);
    return true;
  } catch {
    return false;
  }
}
