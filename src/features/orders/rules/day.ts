import { businessDate, formatShortDate, formatWeekday } from "@/lib/dates";

const DAY_MS = 86_400_000;

// El día del pedido junto a su número, con los días de Lima: nada si es de hoy; ayer, mañana, el día de la semana si
// cae dentro de la semana, o la fecha
export function dueDayLabel(dueDate: string, now: Date): string {
  const days = Math.round((Date.parse(dueDate) - Date.parse(businessDate(now))) / DAY_MS);
  if (days === 0) return "";
  if (days === -1) return "ayer";
  if (days === 1) return "mañana";
  const noon = new Date(`${dueDate}T12:00:00-05:00`);
  if (Math.abs(days) < 7) return `${formatWeekday(noon).toLowerCase()} ${Number(dueDate.slice(8))}`;
  return formatShortDate(noon);
}
