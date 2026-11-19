import type { AutoLockMinutes } from "../constants";

export type { AutoLockMinutes };

// ¿Pedir huella o PIN al volver a la app? Con 0 minutos, siempre; si no, cuando pasaron los minutos elegidos.
// Con el reloj del celular atrasado (tiempo negativo) también pide: no se sabe cuánto pasó.
// ponytail: un reloj atrasado a medias (a un momento justo después de salir) aún acorta la espera; cerrarlo del todo
// necesita el reloj que no se puede cambiar (SystemClock.elapsedRealtime, módulo nativo que Expo Go no trae)
export function shouldAskUnlock(backgroundAt: Date | null, now: Date, minutes: AutoLockMinutes): boolean {
  if (!backgroundAt) return false;
  const elapsed = now.getTime() - backgroundAt.getTime();
  return minutes === 0 || elapsed < 0 || elapsed >= minutes * 60_000;
}
