import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

// Un aviso del propio celular: su título, su texto, cuándo sale (null = ahora) y la pantalla que abre al tocarlo
export type LocalNotice = { id: string; title: string; body: string; at: Date | null; url: string };
export type NotificationPermission = "granted" | "denied" | "undetermined";

const CHANNEL = "reminders";
let prepared: Promise<void> | null = null;

// Una vez por arranque: los avisos se ven también con la app abierta y, en Android, van en su canal «Recordatorios»
function prepare(): Promise<void> {
  prepared ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "Recordatorios",
        importance: AndroidImportance.HIGH,
      });
  })();
  return prepared;
}

export async function notificationPermission(): Promise<NotificationPermission> {
  return (await Notifications.getPermissionsAsync()).status as NotificationPermission;
}

// En Android 13 el canal tiene que existir antes de pedir el permiso
export async function askNotificationPermission(): Promise<boolean> {
  await prepare();
  return (await Notifications.requestPermissionsAsync()).granted;
}

const request = (notice: LocalNotice, trigger: Notifications.NotificationTriggerInput) => ({
  identifier: notice.id,
  content: { title: notice.title, body: notice.body, data: { url: notice.url } },
  trigger,
});

// Cambia todo lo programado por estos avisos (con hora)
export async function replaceScheduled(notices: LocalNotice[]): Promise<void> {
  await prepare();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const notice of notices)
    if (notice.at)
      await Notifications.scheduleNotificationAsync(
        request(notice, { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notice.at, channelId: CHANNEL }),
      );
}

// Los avisos de ahora (un alfajor que se acaba): salen al momento
export async function presentNow(notices: LocalNotice[]): Promise<void> {
  await prepare();
  for (const notice of notices) await Notifications.scheduleNotificationAsync(request(notice, { channelId: CHANNEL }));
}

// Al cerrar la sesión: nada programado ni a la vista, porque los avisos llevan nombres de clientes
export async function clearNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
