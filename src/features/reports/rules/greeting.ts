import { formatTime } from "@/lib/dates";

// Con la hora de Lima: «Buenos días» hasta las 12:00, «Buenas tardes» hasta las 19:00 y «Buenas noches» después
export function greeting(now: Date): string {
  const hour = Number(formatTime(now).slice(0, 2));
  if (hour < 12) return "Buenos días";
  return hour < 19 ? "Buenas tardes" : "Buenas noches";
}
