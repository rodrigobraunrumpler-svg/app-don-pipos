import { onlineManager } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";

import { useOnline } from "./use-online";

afterEach(() => onlineManager.setOnline(true));

test("sigue la señal del celular", async () => {
  const { result } = await renderHook(() => useOnline());
  expect(result.current).toBe(true);
  await act(() => onlineManager.setOnline(false));
  expect(result.current).toBe(false);
});
