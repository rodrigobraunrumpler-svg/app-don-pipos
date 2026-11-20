import { formatCents } from "@/lib/money";

type Titled = {
  kind: "payment" | "refund" | "manual";
  orderNumber: number | null;
  customerName: string | null;
  description: string | null;
};

// El número del pedido como en Pedidos (#0042); un pago y una devolución siempre lo traen
const orderNumber = (number: number | null) => `#${String(number).padStart(4, "0")}`;

export function incomeSaveLabel(cents: number): string {
  return cents > 0 ? `Guardar ingreso de ${formatCents(cents)}` : "Guardar ingreso";
}

// De dónde vino cada ingreso: el pedido y su cliente, la devolución con su pedido, o lo que se anotó a mano
export function incomeTitle(item: Titled): string {
  if (item.kind === "manual") return String(item.description);
  if (item.kind === "refund") return `Devolución, pedido ${orderNumber(item.orderNumber)}`;
  return `Pedido ${orderNumber(item.orderNumber)}, ${item.customerName ?? "mostrador"}`;
}
