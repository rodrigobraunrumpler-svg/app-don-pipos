import type { AutoLockMinutes } from "../constants";

export type { AutoLockMinutes };

// ¿Pedir huella o PIN al volver a la app? Con 0 minutos, siempre; si no, cuando pasaron los minutos elegidos
export function shouldAskUnlock(backgroundAt: Date | null, now: Date, minutes: AutoLockMinutes): boolean {
  if (!backgroundAt) return false;
  return minutes === 0 || now.getTime() - backgroundAt.getTime() >= minutes * 60_000;
}
