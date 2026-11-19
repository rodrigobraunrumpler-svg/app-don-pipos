import { act, renderHook } from "@testing-library/react-native";

import { useRequestId } from "./use-request-id";

test("un código por intención: no cambia entre renders, y cambia con renew", async () => {
  const { result, rerender } = await renderHook(() => useRequestId());
  const first = result.current.requestId;
  expect(first).toMatch(/^[0-9a-f-]{36}$/);
  await rerender({});
  expect(result.current.requestId).toBe(first);
  await act(() => result.current.renew());
  expect(result.current.requestId).not.toBe(first);
});
