import { formatTime } from "@/lib/dates";

// Un pedido que va tarde hoy o atrasado de un día anterior, con su número y su demora ya escritos (de orders)
export type LateOrder = {
  id: string;
  number: string;
  customerName: string | null;
  fulfillment: string;
  promisedAt: string | null;
  dueDate: string;
  lateness: "late" | "overdue";
  label: string;
};
// Un alfajor de Stock, con su línea («Alcanza hasta mañana», de stock)
export type StockLine = {
  productId: string;
  name: string;
  state: string;
  onHand: number;
  coverageDays: number | null;
  line: string;
};
export type UrgentKind = "late" | "more" | "out" | "owed" | "check" | "low";
export type UrgentRow = { id: string; kind: UrgentKind; title: string; detail: string };

// Lo agotado y lo que falta para pedidos van antes que revisar y que lo que se acaba
const STOCK_ORDER: UrgentKind[] = ["out", "owed", "check", "low"];
const PRODUCE = "Registrar producción";

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);
// Lo atrasado de días anteriores primero, del día más viejo; después lo que va tarde hoy, lo prometido antes primero.
// Pedidos los da al revés (del número más nuevo), y así lo más atrasado quedaba abajo
const lateKey = (order: LateOrder): string =>
  order.lateness === "overdue" ? `0 ${order.dueDate}` : `1 ${order.promisedAt ?? ""}`;

function lateFirst(a: LateOrder, b: LateOrder): number {
  const [x, y] = [lateKey(a), lateKey(b)];
  return x === y ? 0 : x < y ? -1 : 1;
}

// Más pedidos por entregar de los que se miraron: alguno puede ir tarde
function moreRow(count: number): UrgentRow {
  const title = `${count} ${count === 1 ? "pedido más" : "pedidos más"} por entregar`;
  return { id: "to_deliver", kind: "more", title, detail: "Míralos en Pedidos: alguno puede ir tarde" };
}

function lateRow(order: LateOrder): UrgentRow {
  const who = `${order.number}${order.customerName ? ` de ${order.customerName}` : ""}`;
  if (order.lateness === "overdue" || !order.promisedAt)
    return { id: order.id, kind: "late", title: `${who} está ${lowerFirst(order.label)}`, detail: "Márcalo o avísale" };
  const verb = order.fulfillment === "pickup" ? "Recoge" : "Entrega";
  return {
    id: order.id,
    kind: "late",
    title: `${who} va ${order.label}`,
    detail: `${verb} a las ${formatTime(new Date(order.promisedAt))}: márcalo o avísale`,
  };
}

function stockRow(item: StockLine): UrgentRow | null {
  const id = item.productId;
  if (item.state === "out") return { id, kind: "out", title: `${item.name} está agotado`, detail: PRODUCE };
  if (item.state === "owed")
    return { id, kind: "owed", title: `${item.name} no alcanza para los pedidos`, detail: item.line };
  if (item.state === "check") return { id, kind: "check", title: `Revisa el stock de ${item.name}`, detail: item.line };
  if (item.state !== "low") return null;
  const title =
    item.coverageDays === null
      ? `${item.name} se está acabando: quedan ${item.onHand}`
      : `${item.name} ${lowerFirst(item.line)}`;
  return { id, kind: "low", title, detail: PRODUCE };
}

// Lo urgente de Inicio, en el orden de reports.md §5: lo atrasado y lo que va tarde (y cuántos pedidos más hay por
// entregar, si no se miraron todos), lo agotado (y lo que falta para pedidos), lo que hay que revisar y lo que se acaba
export function urgentRows(late: LateOrder[], stock: StockLine[], moreToDeliver = 0): UrgentRow[] {
  const stockRows = stock.map(stockRow).filter((row): row is UrgentRow => row !== null);
  return [
    ...[...late].sort(lateFirst).map(lateRow),
    ...(moreToDeliver > 0 ? [moreRow(moreToDeliver)] : []),
    ...STOCK_ORDER.flatMap((kind) => stockRows.filter((row) => row.kind === kind)),
  ];
}
