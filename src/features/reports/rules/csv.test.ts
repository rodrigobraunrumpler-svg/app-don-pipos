import { toCsv } from "./csv";

const METHODS = { cash: "Efectivo", yape: "Yape", plin: "Plin", transfer: "Transferencia" } as const;
const STATUSES = {
  new: "Nuevo",
  preparing: "Preparando",
  on_the_way: "En camino",
  ready: "Listo para recoger",
  delivered: "Entregado",
  cancelled: "Anulado",
} as const;
const LABELS = {
  method: (method: keyof typeof METHODS) => METHODS[method],
  status: (status: keyof typeof STATUSES) => STATUSES[status],
  orderNumber: (number: number) => `#${String(number).padStart(4, "0")}`,
};
const base = { orderNumber: null, customerName: null, detail: null, method: null, status: null };

test("el archivo para Excel en español: BOM, «;», montos «12.00» y una fila por cosa (reports.md §5)", () => {
  const csv = toCsv(
    [
      {
        ...base,
        kind: "order",
        at: "2026-11-09T05:20:00.000Z",
        orderNumber: 3,
        customerName: "Rosa (DEMO)",
        detail: "2 Coquetas",
        amountCents: 2400,
        status: "delivered",
      },
      {
        ...base,
        kind: "payment",
        at: "2026-11-09T05:30:00.000Z",
        orderNumber: 3,
        customerName: "Rosa (DEMO)",
        method: "cash",
        amountCents: 2400,
      },
      {
        ...base,
        kind: "refund",
        at: "2026-11-11T17:00:00.000Z",
        orderNumber: 4,
        customerName: "Rosa (DEMO)",
        method: "cash",
        amountCents: 1200,
      },
      {
        ...base,
        kind: "expense",
        at: "2026-11-10T17:00:00.000Z",
        detail: 'Insumos: harina; azúcar "rubia"',
        method: "yape",
        amountCents: 123456,
      },
      {
        ...base,
        kind: "income",
        at: "2026-11-12T17:00:00.000Z",
        detail: "Evento (DEMO)",
        method: "transfer",
        amountCents: 700,
      },
    ],
    LABELS,
  );
  expect(csv.startsWith("﻿")).toBe(true);
  expect(csv.slice(1).split("\r\n")).toEqual([
    "Tipo;Fecha;Hora;Pedido;Cliente;Detalle;Medio;Monto;Estado",
    "Pedido;09/11/2026;00:20;#0003;Rosa (DEMO);2 Coquetas;;24.00;Entregado",
    "Pago;09/11/2026;00:30;#0003;Rosa (DEMO);;Efectivo;24.00;",
    "Devolución;11/11/2026;12:00;#0004;Rosa (DEMO);;Efectivo;-12.00;",
    'Gasto;10/11/2026;12:00;;;"Insumos: harina; azúcar ""rubia""";Yape;1234.56;',
    "Ingreso;12/11/2026;12:00;;;Evento (DEMO);Transferencia;7.00;",
    "",
  ]);
});

test("un nombre que empieza con «=», «+», «-» o «@» no se lee como fórmula en Excel", () => {
  const csv = toCsv(
    [
      {
        ...base,
        kind: "order",
        at: "2026-11-09T17:00:00.000Z",
        orderNumber: 5,
        customerName: '=HIPERVINCULO("x")',
        detail: "@a",
        amountCents: 1200,
        status: "cancelled",
      },
    ],
    LABELS,
  );
  expect(csv.split("\r\n")[1]).toBe('Pedido;09/11/2026;12:00;#0005;"\'=HIPERVINCULO(""x"")";\'@a;;12.00;Anulado');
});
