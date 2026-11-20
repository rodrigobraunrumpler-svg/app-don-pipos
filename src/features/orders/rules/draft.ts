import { formatCents } from "@/lib/money";

import { PAYMENT_METHOD_LABELS } from "../constants";
import type { DraftState } from "../schema/draft";
import type { OrderDraft, OrderLineInput } from "../schema/order";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

type Totals = { subtotalCents: number; deliveryFeeCents: number; totalCents: number };

// Lo que falta para guardar el pedido, en el orden del formulario; null si ya se puede. El teléfono llega normalizado
// (null si no tiene sus 9 dígitos)
export function draftProblem(
  draft: DraftState,
  { phone, hasItems, totals }: { phone: string | null; hasItems: boolean; totals: Totals },
): string | null {
  if (!hasItems) return "Elige al menos un alfajor.";
  if (!phone) return "Escribe el celular del cliente: 9 dígitos.";
  if (!draft.name.trim()) return "Escribe el nombre del cliente.";
  if (draft.fulfillment === "delivery" && !draft.address.trim()) return "Escribe la dirección de entrega.";
  if (draft.promisedTime && !TIME.test(draft.promisedTime)) return "Escribe la hora como 13:00.";
  if (draft.discountCents > 0 && !draft.discountReason) return "Elige el motivo del descuento.";
  if (draft.discountCents > totals.subtotalCents + totals.deliveryFeeCents)
    return "El descuento no puede pasar del total.";
  if (draft.paymentMode !== "none" && !draft.paymentMethod) return "Elige con qué pagó.";
  if (draft.paymentMode === "part" && draft.paymentCents < 1) return "Escribe cuánto adelantó.";
  if (draft.paymentMode === "part" && draft.paymentCents > totals.totalCents)
    return "El adelanto no puede pasar del total.";
  return null;
}

// El borrador como lo recibe create_order, sin lo vacío. La hora acordada va con el día del pedido, en hora de Lima
export function toOrderDraft(
  draft: DraftState,
  { phone, today, totalCents, lines }: { phone: string; today: string; totalCents: number; lines: OrderLineInput[] },
): OrderDraft {
  const amount = draft.paymentMode === "all" ? totalCents : draft.paymentMode === "part" ? draft.paymentCents : 0;
  const note = draft.note.trim();
  return {
    customer: { phone, name: draft.name.trim() },
    fulfillment: draft.fulfillment,
    ...(draft.fulfillment === "delivery" ? { deliveryAddress: draft.address.trim() } : {}),
    ...(draft.scheduledFor ? { scheduledFor: draft.scheduledFor } : {}),
    ...(draft.promisedTime ? { promisedAt: `${draft.scheduledFor ?? today}T${draft.promisedTime}:00-05:00` } : {}),
    ...(draft.discountCents > 0 ? { discountCents: draft.discountCents, discountReason: draft.discountReason } : {}),
    ...(amount > 0 && draft.paymentMethod ? { payment: { method: draft.paymentMethod, amountCents: amount } } : {}),
    ...(note ? { note } : {}),
    lines,
  };
}

// Cómo queda el cobro, debajo del total del resumen
export function collectionText(draft: DraftState, totalCents: number): string {
  const method = draft.paymentMethod ? ` con ${PAYMENT_METHOD_LABELS[draft.paymentMethod]}` : "";
  if (draft.paymentMode === "all") return `Pagado ahora${method}.`;
  if (draft.paymentMode === "part") {
    const due = Math.max(0, totalCents - draft.paymentCents);
    return `Adelanto de ${formatCents(draft.paymentCents)}${method}. Falta ${formatCents(due)}.`;
  }
  return `Se cobra ${formatCents(totalCents)} ${draft.fulfillment === "pickup" ? "al recoger" : "al recibir"}.`;
}
