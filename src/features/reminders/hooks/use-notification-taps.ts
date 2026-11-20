import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

// Al tocar un aviso se abre su pantalla. Va en el layout principal: un aviso tocado con la app bloqueada se abre al entrar.
// Después se borra, para que no se vuelva a abrir al volver a la app
export function useNotificationTaps(onOpen: (url: string) => void): void {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;
    const url = response.notification.request.content.data?.url;
    if (typeof url === "string") onOpen(url);
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, onOpen]);
}
