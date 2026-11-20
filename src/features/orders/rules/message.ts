import { formatLongDate, formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { orderNumber } from "./number";
import type { Order, PaymentMethod } from "../schema/order";

// Los medios, como los dice el mensaje: «Yape, Plin, transferencia o efectivo»
const SPOKEN: [PaymentMethod, string][] = [
  ["yape", "Yape"],
  ["plin", "Plin"],
  ["transfer", "transferencia"],
  ["cash", "efectivo"],
];

// Sin los ajustes cargados, nombra los cuatro
function spokenMethods(methods: PaymentMethod[]): string {
  const chosen = SPOKEN.filter(([method]) => methods.includes(method));
  const names = (chosen.length ? chosen : SPOKEN).map(([, name]) => name);
  const last = String(names.pop());
  return names.length ? `${names.join(", ")} o ${last}` : last;
}

function scheduledText(order: Order): string {
  const day = formatLongDate(new Date(`${order.scheduledFor}T12:00:00-05:00`));
  const time = order.promisedAt ? `, a las ${formatTime(new Date(order.promisedAt))}` : "";
  return `${day.charAt(0).toLowerCase()}${day.slice(1)}${time}`;
}

// Los datos de un pedido para llenar los mensajes de WhatsApp (contexto de la maqueta). {adelanto}, {entrega} y {pago}
// son frases completas o nada; {sellos} lo arma quien llama con la fidelidad (loyalty), o queda vacío
export function messageContext(order: Order, methods: PaymentMethod[], sellos = ""): Record<string, string> {
  const due = order.totalCents - order.paidCents;
  const name = order.customer?.name ?? order.customerName ?? "";
  return {
    nombre: name.replace(/ .*/, ""),
    numero: orderNumber(order.number),
    detalle: order.itemsSummary,
    total: formatCents(order.totalCents),
    falta: formatCents(due),
    adelanto:
      due <= 0
        ? "Ya está pagado."
        : order.paidCents > 0
          ? `Recibimos tu adelanto de ${formatCents(order.paidCents)}; faltan ${formatCents(due)}.`
          : "",
    entrega: order.scheduledFor
      ? `Lo entregamos el ${scheduledText(order)}.`
      : order.fulfillment === "pickup"
        ? "Te avisamos cuando esté listo para recoger."
        : order.fulfillment === "delivery"
          ? "Te avisamos cuando salga."
          : "",
    pago: due > 0 ? `Total a pagar: ${formatCents(due)} (${spokenMethods(methods)}).` : "Ya está pagado.",
    sellos,
  };
}
