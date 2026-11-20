import { businessDate, formatShortDate, formatTime, previousDay } from "@/lib/dates";

// De cuándo es lo que se ve sin señal: «a las 11:32» si fue hoy, «ayer a las 18:40» o «el 9 nov a las 18:40». Así lo
// cobrado de ayer no se lee como de hoy
export function loadedWhen(loadedAt: Date, now: Date): string {
  const time = `a las ${formatTime(loadedAt)}`;
  const day = businessDate(loadedAt);
  const today = businessDate(now);
  if (day === today) return time;
  if (day === previousDay(today)) return `ayer ${time}`;
  return `el ${formatShortDate(loadedAt)} ${time}`;
}
