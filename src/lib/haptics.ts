import { notificationAsync, NotificationFeedbackType } from "expo-haptics";

// Una vibración corta al guardar (PROJECT_CONTEXT.md §14.4). Si el celular no vibra, no pasa nada
export function confirmTap(): void {
  notificationAsync(NotificationFeedbackType.Success).catch(() => undefined);
}
