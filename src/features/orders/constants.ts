// Lo que dice cada estado, cada entrega y cada medio de pago (la maqueta)
export const STATUS_LABELS = {
  new: "Nuevo",
  preparing: "Preparando",
  on_the_way: "En camino",
  ready: "Listo para recoger",
  delivered: "Entregado",
  cancelled: "Anulado",
} as const;

export const FULFILLMENT_LABELS = { delivery: "Delivery", pickup: "Recoge", counter: "Mostrador" } as const;

// En el orden de la venta de mostrador: efectivo primero
export const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  transfer: "Transferencia",
} as const;
