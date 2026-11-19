const alfajores = (count: number): string => `${count} ${count === 1 ? "alfajor" : "alfajores"}`;

export function productionTotal(amounts: Record<string, number>): number {
  return Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
}

export function productionSaveLabel(total: number): string {
  return total === 0 ? "Guardar producción" : `Guardar producción: ${alfajores(total)}`;
}

// Lo que dice después de guardar. `backOnWeb`: los alfajores enlazados a la web que vuelven a tener stock
export function productionSavedText(total: number, backOnWeb: string[]): string {
  const saved = `Sumaste ${alfajores(total)} y el stock ya está al día.`;
  if (backOnWeb.length === 0) return saved;
  if (backOnWeb.length === 1) return `${saved} ${backOnWeb[0]} vuelve a aparecer disponible en la web.`;
  const names = `${backOnWeb.slice(0, -1).join(", ")} y ${backOnWeb[backOnWeb.length - 1]}`;
  return `${saved} ${names} vuelven a aparecer disponibles en la web.`;
}
