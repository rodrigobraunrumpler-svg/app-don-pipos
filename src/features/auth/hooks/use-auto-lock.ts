import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { isAutoLockHeld } from "@/lib/auto-lock-hold";

import { shouldAskUnlock, type AutoLockMinutes } from "../rules/lock";

type Options = { minutes: AutoLockMinutes; enabled: boolean; onLock: () => void; now?: () => Date };

// Al volver de segundo plano, pide huella o PIN si pasaron los minutos elegidos (docs/spec/auth.md §5). Mientras la app
// abrió la cámara (isAutoLockHeld), ese ir y volver no cuenta: si no, el bloqueo borraba el formulario del gasto
export function useAutoLock({ minutes, enabled, onLock, now = () => new Date() }: Options): void {
  const backgroundAt = useRef<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundAt.current = isAutoLockHeld() ? null : now();
      } else if (state === "active") {
        if (!isAutoLockHeld() && shouldAskUnlock(backgroundAt.current, now(), minutes)) onLock();
        backgroundAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled, minutes, onLock, now]);
}
