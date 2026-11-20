import { formatTime } from "@/lib/dates";

import type { ExportRow, OrderStatus, PaymentMethod } from "../schema/report";

// Cómo la app nombra cada medio, cada estado y cada número de pedido (de businesses y orders)
export type CsvNames = {
  method: (method: PaymentMethod) => string;
  status: (status: OrderStatus) => string;
  orderNumber: (number: number) => string;
};

const KIND_LABELS = { order: "Pedido", payment: "Pago", refund: "Devolución", expense: "Gasto", income: "Ingreso" };
const HEADER = "Tipo;Fecha;Hora;Pedido;Cliente;Detalle;Medio;Monto;Estado";
const BOM = "\uFEFF";

// Un texto que escribió alguien: con «'» delante si Excel lo leería como fórmula, y entre comillas si trae «;»,
// comillas o saltos de línea
function text(value: string | null): string {
  const safe = value && /^[=+\-@\t\r]/.test(value) ? `'${value}` : (value ?? "");
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// «12.00», con «-» en las devoluciones: Excel lo lee como número
function amount({ kind, amountCents }: ExportRow): string {
  const sign = kind === "refund" ? "-" : "";
  return `${sign}${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`;
}

// El archivo para Excel en español (reports.md §5): BOM UTF-8, separador «;», una fila por pedido, pago, devolución,
// gasto o ingreso, con su día y la columna «Tipo» para filtrar. Un pedido va con su día y su hora acordada (sin ella,
// vacía)
export function toCsv(rows: ExportRow[], names: CsvNames): string {
  const lines = rows.map((row) => {
    const [year, month, day] = row.day.split("-");
    return [
      KIND_LABELS[row.kind],
      `${day}/${month}/${year}`,
      row.at === null ? "" : formatTime(new Date(row.at)),
      row.orderNumber === null ? "" : names.orderNumber(row.orderNumber),
      text(row.customerName),
      text(row.detail),
      row.method === null ? "" : names.method(row.method),
      amount(row),
      row.status === null ? "" : names.status(row.status),
    ].join(";");
  });
  return `${BOM}${[HEADER, ...lines].join("\r\n")}\r\n`;
}
