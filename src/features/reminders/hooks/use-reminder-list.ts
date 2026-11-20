import { listReminders } from "../rules/build";
import type { Reminder } from "../schema/reminder";
import { useReminderSources } from "./use-reminder-sources";

// Los avisos de ahora, para la campana de Inicio: con lo que ya llegó, dichos a hoy
export function useReminderList(): Reminder[] {
  const { settings, upcoming, receivables, stock } = useReminderSources();
  if (!settings) return [];
  return listReminders(
    { upcoming: upcoming ?? [], receivables: receivables ?? [], stock: stock ?? [], notifiedToday: [] },
    settings,
    new Date(),
  );
}
