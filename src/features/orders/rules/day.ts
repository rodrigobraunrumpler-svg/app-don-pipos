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

const pad = (value: number) => String(value).padStart(2, "0");

// La fecha si existe (31/2 no existe), como «aaaa-mm-dd»
function realDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? `${year}-${pad(month)}-${pad(day)}` : null;
}

// «Otra fecha» escrita como día/mes, o día/mes/año («24/12», «5-1», «24/12/2027»): la próxima vez que llega, desde
// hoy. Una fecha que no existe o que ya pasó no vale (null). El 29/2 espera al próximo año bisiesto
export function parseDayMonth(text: string, today: string): string | null {
  const match = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const thisYear = Number(today.slice(0, 4));
  const years = match[3]
    ? [Number(match[3]) + (match[3].length === 2 ? 2000 : 0)]
    : [thisYear, thisYear + 1, thisYear + 2, thisYear + 3, thisYear + 4];
  for (const year of years) {
    const date = realDate(year, month, day);
    if (date && date >= today) return date;
  }
  return null;
}
