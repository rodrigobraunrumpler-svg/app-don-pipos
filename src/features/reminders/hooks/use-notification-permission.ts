import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { askNotificationPermission, notificationPermission, type NotificationPermission } from "@/lib/notifications";

// Si el celular deja que la app mande avisos. Se vuelve a leer al volver a la app: el dueño pudo darlo en los ajustes
export function useNotificationPermission(): { status: NotificationPermission | null; ask: () => Promise<void> } {
  const [status, setStatus] = useState<NotificationPermission | null>(null);
  useEffect(() => {
    let active = true;
    const read = () =>
      void notificationPermission().then((current) => {
        if (active) setStatus(current);
      });
    read();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return {
    status,
    ask: async () => setStatus((await askNotificationPermission()) ? "granted" : await notificationPermission()),
  };
}
