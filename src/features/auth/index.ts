// Módulo auth: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { attemptsLabel } from "./rules/attempts";
export { shouldAskUnlock } from "./rules/lock";
export type { AutoLockMinutes } from "./rules/lock";
export { pinIsObvious } from "./rules/pin";
export { UnlockProvider } from "./components/unlock-provider";
export type { AccessState } from "./hooks/unlock-context";
export { useUnlock } from "./hooks/use-unlock";
