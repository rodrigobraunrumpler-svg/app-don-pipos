// Cuándo pedir huella o PIN al volver a la app, con los textos de la maqueta (Más → Cuenta)
export const AUTO_LOCK_CHOICES = [0, 1, 5, 15] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_CHOICES)[number];
export const DEFAULT_AUTO_LOCK: AutoLockMinutes = 5;
export const AUTO_LOCK_LABELS: Record<AutoLockMinutes, string> = {
  0: "Al salir",
  1: "Al minuto",
  5: "A los 5 min",
  15: "A los 15 min",
};

export const PIN_LENGTH = 6;
// Errores seguidos del PIN del celular antes de cerrar la sesión de este celular
export const MAX_LOCAL_ERRORS = 5;
