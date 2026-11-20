import { renderHook } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";

import { useNotificationTaps } from "./use-notification-taps";

test("tocar un aviso abre su pantalla una sola vez", async () => {
  const response = {
    actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
    notification: { date: 1, request: { identifier: "order:o1", content: { data: { url: "/orders/o1" } } } },
  };
  jest.mocked(Notifications.useLastNotificationResponse).mockReturnValue(response as never);
  const onOpen = jest.fn();
  const { rerender } = await renderHook(() => useNotificationTaps(onOpen));
  await rerender({});
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onOpen).toHaveBeenCalledWith("/orders/o1");
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
});

test("sin un aviso tocado no abre nada", async () => {
  jest.mocked(Notifications.useLastNotificationResponse).mockReturnValue(null);
  const onOpen = jest.fn();
  await renderHook(() => useNotificationTaps(onOpen));
  expect(onOpen).not.toHaveBeenCalled();
});
