import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const notice = {
  id: "order:o1",
  title: "Mañana: pedido de Ana (DEMO)",
  body: "1 Coqueta para recoger.",
  at: new Date(),
  url: "/orders/o1",
};

test("desde que abre la app, un aviso que llega con la app abierta se muestra como banner", async () => {
  const { setupNotifications } = jest.requireActual<typeof import("./notifications")>("./notifications");
  setupNotifications();
  const [handler] = jest.mocked(Notifications.setNotificationHandler).mock.calls.at(-1) ?? [];
  await expect(handler?.handleNotification({} as never)).resolves.toMatchObject({
    shouldShowBanner: true,
    shouldShowList: true,
  });
});

test("si preparar el canal de Android falla una vez, la próxima vez lo intenta otra vez", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  const channel = jest.mocked(Notifications.setNotificationChannelAsync);
  channel.mockClear();
  channel.mockRejectedValueOnce(new Error("sin canal"));
  // Un módulo nuevo: lo preparado en otra prueba no cuenta
  let replaceScheduled: typeof import("./notifications").replaceScheduled = async () => undefined;
  jest.isolateModules(() => {
    ({ replaceScheduled } = jest.requireActual<typeof import("./notifications")>("./notifications"));
  });
  await expect(replaceScheduled([notice])).rejects.toThrow("sin canal");
  await expect(replaceScheduled([notice])).resolves.toBeUndefined();
  expect(channel).toHaveBeenCalledTimes(2);
});
