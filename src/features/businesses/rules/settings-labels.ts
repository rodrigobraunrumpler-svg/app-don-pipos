import { formatCents } from "@/lib/money";

import type { PaymentMethod } from "../schema/payment-method";
import type { ReminderSettings } from "../schema/business";

// Los textos de las filas de Ajustes (docs/spec/businesses.md §5)
export const methodsLabel = (methods: readonly PaymentMethod[]): string => `${methods.length}`;

export const deliveryLabel = (cents: number): string => (cents === 0 ? "Sin costo" : formatCents(cents));

export const productionLabel = (days: number): string => (days === 1 ? "Cada día" : `Cada ${days} días`);

export const productionNote = (days: number): string =>
  `${days === 1 ? "Produces todos los días" : `Cada ${days} días`}: Inicio y Stock sugieren para ese periodo.`;

export const lapsedLabel = (days: number): string => `${days} días`;

export function remindersLabel(reminders: ReminderSettings): string {
  const active = Object.values(reminders).filter(Boolean).length;
  if (active === 0) return "Apagados";
  return active === 1 ? "1 activo" : `${active} activos`;
}
