// Mientras la app muestra una pantalla del sistema (la cámara de la boleta, su permiso), ir a segundo plano no es
// irse: el bloqueo automático espera. Quien la abre la toma y la suelta al volver
let holds = 0;

export function holdAutoLock(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
  };
}

export function isAutoLockHeld(): boolean {
  return holds > 0;
}
