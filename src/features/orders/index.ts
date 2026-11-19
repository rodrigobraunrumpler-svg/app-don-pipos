// Módulo orders: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { lateness, latenessLabel } from "./rules/lateness";
export type { Lateness } from "./rules/lateness";
export { orderNumber } from "./rules/number";
export { paymentLabel } from "./rules/payment";
export { nextStatus, nextStatusLabel } from "./rules/status";
export { draftTotal } from "./rules/totals";
export type { Channel, Fulfillment, OrderStatus, PaymentMethod } from "./schema/order";
