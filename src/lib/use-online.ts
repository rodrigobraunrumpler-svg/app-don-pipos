import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

// ¿Hay señal? La misma que usa TanStack Query (expo-network, en lib/query.ts)
export function useOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  );
}
