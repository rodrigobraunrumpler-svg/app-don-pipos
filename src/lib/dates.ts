import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// El nombre de la zona, para la base de datos
export const TIME_ZONE = "America/Lima";
// En el celular se usa su desfase, que es fijo: Perú no cambia la hora desde 1994. Así las fechas no dependen de lo que
// el motor de JavaScript del celular (Hermes) sepa de zonas horarias: para leer el desfase de una zona con nombre,
// @date-fns/tz usa una función de Intl que, según su documentación, Hermes no trae
const LIMA_OFFSET = "-05:00";

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const inLima = (instant: Date): TZDate => new TZDate(instant.getTime(), LIMA_OFFSET);

// El día del negocio es el de Lima: a las 23:59 de Lima (04:59 UTC del día siguiente) sigue siendo el mismo día
export function businessDate(instant: Date): string {
  return format(inLima(instant), "yyyy-MM-dd");
}

// Desde las 00:00 de Lima hasta las 00:00 del día siguiente (sin incluirla), como instantes.
// Solo acepta un día que existe, escrito AAAA-MM-DD: «2026-02-30» o «18-11-2026» darían, sin avisar, el rango de otro día
export function businessDayRange(date: string): { from: Date; to: Date } {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const from = new TZDate(year, month - 1, day, LIMA_OFFSET);
  if (!DAY_FORMAT.test(date) || businessDate(from) !== date)
    throw new RangeError(`«${date}» no es un día válido. Se espera AAAA-MM-DD, como 2026-11-18.`);
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

// «Lunes», con mayúscula
export function formatWeekday(instant: Date): string {
  const text = format(inLima(instant), "EEEE", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// «11 nov»
export function formatShortDate(instant: Date): string {
  return format(inLima(instant), "d MMM", { locale: es });
}

// Cuándo pasó algo, en una fila: «Hoy, 09:10», «Ayer, 23:30», el día dentro de la semana («Lunes 16») y antes, o
// después, la fecha («9 nov»). Con los días de Lima
export function formatWhen(instant: Date, now: Date): string {
  const days = Math.round((Date.parse(businessDate(now)) - Date.parse(businessDate(instant))) / DAY_MS);
  if (days === 0) return `Hoy, ${formatTime(instant)}`;
  if (days === 1) return `Ayer, ${formatTime(instant)}`;
  if (days > 1 && days < 7) return `${formatWeekday(instant)} ${format(inLima(instant), "d")}`;
  return formatShortDate(instant);
}

// «noviembre», el mes de Lima
export function formatMonth(instant: Date): string {
  return format(inLima(instant), "MMMM", { locale: es });
}

// El día anterior a un día de Lima («2026-11-01» → «2026-10-31»)
export function previousDay(date: string): string {
  const { from } = businessDayRange(date);
  return businessDate(new Date(from.getTime() - DAY_MS));
}
