import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// El nombre de la zona, para la base de datos
export const TIME_ZONE = "America/Lima";
// En el celular se usa su desfase, que es fijo: Perú no cambia la hora desde 1994. Así no hace falta que el motor
// de JavaScript traiga los datos de las zonas horarias (el del celular, Hermes, no los trae)
const LIMA_OFFSET = "-05:00";

const inLima = (instant: Date): TZDate => new TZDate(instant.getTime(), LIMA_OFFSET);

// El día del negocio es el de Lima: a las 23:59 de Lima (04:59 UTC del día siguiente) sigue siendo el mismo día
export function businessDate(instant: Date): string {
  return format(inLima(instant), "yyyy-MM-dd");
}

// Desde las 00:00 de Lima hasta las 00:00 del día siguiente (sin incluirla), como instantes
export function businessDayRange(date: string): { from: Date; to: Date } {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const from = new TZDate(year, month - 1, day, LIMA_OFFSET);
  const to = new TZDate(year, month - 1, day + 1, LIMA_OFFSET);
  return { from: new Date(from.getTime()), to: new Date(to.getTime()) };
}

export function formatLongDate(instant: Date): string {
  const text = format(inLima(instant), "EEEE d 'de' MMMM", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(instant: Date): string {
  return format(inLima(instant), "HH:mm");
}
