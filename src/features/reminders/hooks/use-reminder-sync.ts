import { useEffect, useRef } from "react";

import { businessDate } from "@/lib/dates";
import {
  askNotificationPermission,
  notificationPermission,
  presentNow,
  replaceScheduled,
  type LocalNotice,
} from "@/lib/notifications";

import { buildReminders } from "../rules/build";
import { targetHref } from "../rules/target";
import type { Reminder } from "../schema/reminder";
import { readNotifiedToday, saveNotifiedToday } from "./notified-today";
import { useReminderSources } from "./use-reminder-sources";

const toNotice = (reminder: Reminder): LocalNotice => ({
  id: reminder.id,
  title: reminder.title,
  body: reminder.body,
  at: reminder.at,
  url: targetHref(reminder.target),
});

// Los avisos del celular, al día con lo último que la app supo (docs/spec/reminders.md §3). Cada vez que llegan datos
// nuevos (al abrir, al volver y después de guardar) los recalcula: si lo programado cambió, lo reemplaza; lo de ahora
// sale una vez. El permiso se pide una vez, si nunca se pidió; sin él, no queda nada programado
export function useReminderSync(): void {
  const { settings, upcoming, receivables, stock } = useReminderSources();
  const programmed = useRef<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!settings || !upcoming || !receivables || !stock) return;
    let active = true;

    async function allowed(): Promise<boolean> {
      const status = await notificationPermission();
      if (status === "granted") return true;
      if (status === "denied" || asked.current) return false;
      asked.current = true;
      return askNotificationPermission();
    }

    async function sync(switches: NonNullable<typeof settings>) {
      const now = new Date();
      const today = businessDate(now);
      const notifiedToday = await readNotifiedToday(today);
      const reminders = buildReminders(
        { upcoming: upcoming ?? [], receivables: receivables ?? [], stock: stock ?? [], notifiedToday },
        switches,
        now,
      );
      const on = Object.values(switches).some(Boolean) && (await allowed());
      if (!active) return;
      const later = on ? reminders.filter((reminder) => reminder.at !== null).map(toNotice) : [];
      const signature = JSON.stringify(later);
      if (signature !== programmed.current) {
        programmed.current = signature;
        await replaceScheduled(later);
      }
      const fresh = on ? reminders.filter((reminder) => reminder.at === null) : [];
      if (!active || fresh.length === 0) return;
      await presentNow(fresh.map(toNotice));
      await saveNotifiedToday(today, [...notifiedToday, ...fresh.map((reminder) => reminder.id)]);
    }

    void sync(settings);
    return () => {
      active = false;
    };
  }, [settings, upcoming, receivables, stock]);
}
