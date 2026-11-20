// Los medios de pago, como se dicen en pantalla, en el orden de los chips: efectivo primero. Los usan gastos, ingresos
// y la caja (pedidos tiene los suyos en su módulo, porque sus cuentas los usan)
export const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transfer: "Transferencia",
} as const;

export const PAYMENT_METHODS = ["cash", "yape", "plin", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
