// Módulo orders: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { lateness, latenessLabel } from "./rules/lateness";
export type { Lateness } from "./rules/lateness";
export { orderNumber } from "./rules/number";
export { paymentLabel } from "./rules/payment";
export { nextStatus, nextStatusLabel } from "./rules/status";
export { draftTotal } from "./rules/totals";
export type {
  Channel,
  Fulfillment,
  Order,
  OrderCounts,
  OrderDraft,
  OrderFilter,
  OrderLineInput,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
} from "./schema/order";
export {
  useAddPayment,
  useAdvanceOrder,
  useCreateCounterSale,
  useCreateOrder,
  useRevertStatus,
} from "./hooks/use-order-changes";
export { ordersKeys } from "./queries/keys";
export { orderCountsQuery, orderQuery, ordersQuery } from "./queries/orders";
export { OrderList } from "./components/order-list";
