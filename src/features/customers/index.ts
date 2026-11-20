// Módulo customers: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { lastOrderLabel } from "./rules/last-order";
export { formatPhone, normalizePhone } from "./rules/phone";
export { CustomerLookup } from "./components/customer-lookup";
export { customersKeys } from "./queries/keys";
export { customerByPhoneQuery, customerQuery, customersQuery } from "./queries/customers";
export { useAnonymizeCustomer, useUpdateCustomer } from "./hooks/use-customer-changes";
export type { Customer, CustomerFilter, CustomerMatch, CustomerRow, RepeatLine } from "./schema/customer";
export { CustomersScreen } from "./components/customers-screen";
export { CustomersRow } from "./components/customers-row";
