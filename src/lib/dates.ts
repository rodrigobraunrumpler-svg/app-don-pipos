import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const TIME_ZONE = "America/Lima";

const inLima = (instant: Date): TZDate => new TZDate(instant.getTime(), TIME_ZONE);

// El día del negocio es el de Lima: a las 23:59 de Lima (04:59 UTC del día siguiente) sigue siendo el mismo día
export function businessDate(instant: Date): string {
  return format(inLima(instant), "yyyy-MM-dd");
}

// Desde las 00:00 de Lima hasta las 00:00 del día siguiente (sin incluirla), como instantes
export function businessDayRange(date: string): { from: Date; to: Date } {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const from = new TZDate(year, month - 1, day, TIME_ZONE);
  const to = new TZDate(year, month - 1, day + 1, TIME_ZONE);
  return { from: new Date(from.getTime()), to: new Date(to.getTime()) };
}

export function formatLongDate(instant: Date): string {
  const text = format(inLima(instant), "EEEE d 'de' MMMM", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(instant: Date): string {
  return format(inLima(instant), "HH:mm");
}
