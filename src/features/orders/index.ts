// Módulo orders: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { lateness, latenessLabel } from "./rules/lateness";
export type { Lateness } from "./rules/lateness";
export { orderNumber } from "./rules/number";
export { paymentLabel } from "./rules/payment";
export { nextStatus, nextStatusLabel, statusLabel } from "./rules/status";
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
  Payment,
  PaymentMethod,
  Receivable,
} from "./schema/order";
export {
  useAddPayment,
  useAdvanceOrder,
  useCreateCounterSale,
  useCreateOrder,
  useRevertStatus,
} from "./hooks/use-order-changes";
export { ordersKeys } from "./queries/keys";
export { orderCountsQuery, orderQuery, ordersQuery, receivablesQuery } from "./queries/orders";
export {
  useCancelOrder,
  useChangePaymentMethod,
  useEditOrder,
  useRevertCancel,
  useRevertEdit,
} from "./hooks/use-order-corrections";
export { receivableReason } from "./rules/receivable";
export { OrderList } from "./components/order-list";
export { OrderRow } from "./components/order-row";
export { Receivables } from "./components/receivables";
export { ReceivablesRow } from "./components/receivables-row";
export { NewMenu } from "./components/new-menu";
export { OrderDraftProvider } from "./components/order-draft-provider";
export { DraftItemsStep } from "./components/draft-items-step";
export { DraftDetailsStep } from "./components/draft-details-step";
export { SavedOrder } from "./components/saved-order";
export { OrderDetail } from "./components/order-detail";
export { CounterSale } from "./components/counter-sale";
