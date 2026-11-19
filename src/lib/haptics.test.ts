import * as Haptics from "expo-haptics";

import { confirmTap } from "./haptics";

test("al guardar, una vibración corta de éxito", () => {
  confirmTap();
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
});

test("si el celular no puede vibrar, no pasa nada", async () => {
  jest.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error("sin motor"));
  expect(() => confirmTap()).not.toThrow();
  await new Promise(process.nextTick);
});
