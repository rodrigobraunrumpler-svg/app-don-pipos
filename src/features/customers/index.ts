// Módulo customers: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { lastOrderLabel } from "./rules/last-order";
export { formatPhone, normalizePhone } from "./rules/phone";
export { CustomerLookup } from "./components/customer-lookup";
export { customersKeys } from "./queries/keys";
export type { CustomerMatch, RepeatLine } from "./schema/customer";
