const MINUS = "−";

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

// La diferencia entre lo contado y lo que debería haber en la nevera (libre + apartado)
export function differenceLabel(counted: number, physical: number): string {
  const difference = counted - physical;
  if (difference === 0) return "Igual";
  return difference > 0 ? `+${difference}` : `${MINUS}${-difference}`;
}

// Lo que debería haber en la nevera. Si lo libre es negativo, lo que hay está todo apartado; nunca pide menos de 0
export function expectedLabel(onHand: number, reserved: number): string {
  const physical = Math.max(onHand + reserved, 0);
  const base = `Deberías tener ${physical} en la nevera`;
  if (reserved <= 0 || physical === 0) return base;
  if (onHand <= 0) return `${base} (todos apartados para pedidos)`;
  return `${base} (${onHand} ${plural(onHand, "libre", "libres")} y ${reserved} ${plural(reserved, "apartado", "apartados")} para pedidos)`;
}

export function countSaveLabel(changes: number): string {
  if (changes === 0) return "Sin diferencias";
  return `Guardar ${changes} ${plural(changes, "ajuste", "ajustes")}`;
}
