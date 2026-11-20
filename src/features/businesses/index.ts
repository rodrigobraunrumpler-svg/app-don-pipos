// Módulo businesses: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { businessQuery } from "./queries/business";
export type { Business } from "./schema/business";
export { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "./schema/payment-method";
export type { PaymentMethod } from "./schema/payment-method";
