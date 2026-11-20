import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

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
import type { Reminder, ReminderData, ReminderSwitches } from "../schema/reminder";
import { readNotifiedToday, saveNotifiedToday } from "./notified-today";
import { useReminderSources } from "./use-reminder-sources";

type Sources = Omit<ReminderData, "notifiedToday"> & { settings: ReminderSwitches };

const toNotice = (reminder: Reminder): LocalNotice => ({
  id: reminder.id,
  title: reminder.title,
  body: reminder.body,
  at: reminder.at,
  url: targetHref(reminder.target),
});

// Los avisos del celular, al día con lo último que la app supo (docs/spec/reminders.md §3). Cada vez que llegan datos
// nuevos (al abrir, después de guardar) y al volver a la app (el dueño pudo dar el permiso en los ajustes), los
// recalcula: si lo programado cambió, lo reemplaza; lo de ahora sale una vez. Las corridas van de a una, en orden: una
// recarga con el diálogo de permiso abierto espera su respuesta y no deja todo cancelado. El permiso se pide la primera
// vez que hay algo que avisar, una sola vez; sin él no queda nada programado
export function useReminderSync(): void {
  const { settings, upcoming, receivables, stock } = useReminderSources();
  const programmed = useRef<string | null>(null);
  const permission = useRef<Promise<boolean> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [awake, setAwake] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setAwake((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!settings || !upcoming || !receivables || !stock) return;
    const sources: Sources = { settings, upcoming, receivables, stock };

    async function allowed(): Promise<boolean> {
      const status = await notificationPermission();
      if (status !== "undetermined") return status === "granted";
      permission.current ??= askNotificationPermission();
      return permission.current;
    }

    async function sync({ settings: switches, ...data }: Sources) {
      const now = new Date();
      const today = businessDate(now);
      const notifiedToday = await readNotifiedToday(today);
      const reminders = buildReminders({ ...data, notifiedToday }, switches, now);
      const on = reminders.length > 0 && (await allowed());
      const later = on ? reminders.filter((reminder) => reminder.at !== null).map(toNotice) : [];
      const signature = JSON.stringify(later);
      if (signature !== programmed.current) {
        await replaceScheduled(later);
        programmed.current = signature;
      }
      const fresh = on ? reminders.filter((reminder) => reminder.at === null) : [];
      if (fresh.length === 0) return;
      await presentNow(fresh.map(toNotice));
      await saveNotifiedToday(today, [...notifiedToday, ...fresh.map((reminder) => reminder.id)]);
    }

    // ponytail: si el celular no deja programar, se intenta otra vez con la próxima corrida
    queue.current = queue.current.then(() => sync(sources)).catch(() => undefined);
  }, [settings, upcoming, receivables, stock, awake]);
}
