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

// Los filtros de la lista, en el orden de la maqueta
export const FILTER_LABELS = {
  today: "Hoy",
  to_deliver: "Por entregar",
  to_collect: "Por cobrar",
  upcoming: "Próximos",
  all: "Todos",
} as const;

// El ícono de cada estado (MaterialCommunityIcons), en el chip y en la línea de tiempo
export const STATUS_ICONS = {
  new: "creation",
  preparing: "chef-hat",
  on_the_way: "moped",
  ready: "shopping-outline",
  delivered: "check-all",
  cancelled: "close-circle-outline",
} as const;

// El mensaje de WhatsApp de cada estado; «preparando» y «anulado» no avisan
export const STATUS_TEMPLATES: Partial<
  Record<keyof typeof STATUS_LABELS, "confirmation" | "on_the_way" | "ready" | "delivered">
> = {
  new: "confirmation",
  on_the_way: "on_the_way",
  ready: "ready",
  delivered: "delivered",
};
