// Módulo businesses: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { businessQuery } from "./queries/business";
export { businessesKeys } from "./queries/keys";
export type { Business, BusinessSettings, ReminderSettings, SettingsPatch } from "./schema/business";
export { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "./schema/payment-method";
export type { PaymentMethod } from "./schema/payment-method";
export { useUpdateSettings } from "./hooks/use-update-settings";
export { useSetupState } from "./hooks/use-setup-state";
export type { SetupState } from "./hooks/use-setup-state";
export { useCompleteSetup } from "./hooks/use-complete-setup";
export { useFinishSetup } from "./hooks/use-finish-setup";
export {
  deliveryLabel,
  lapsedLabel,
  methodsLabel,
  productionLabel,
  productionNote,
  remindersLabel,
} from "./rules/settings-labels";
export { useSaveSettings } from "./hooks/use-save-settings";
export { PaymentMethodsRow } from "./components/payment-methods-row";
export { DeliveryRow } from "./components/delivery-row";
export { ProductionRow } from "./components/production-row";
export { LapsedRow } from "./components/lapsed-row";
export { SetupGate } from "./components/setup-gate";
export { SetupDraftProvider } from "./components/setup-draft-provider";
export { SetupProductsStep } from "./components/setup-products-step";
export { SetupStockStep } from "./components/setup-stock-step";
export { SetupExpensesStep } from "./components/setup-expenses-step";
export { SetupDone } from "./components/setup-done";
export { BackupStatus } from "./components/backup-status";
export { ProductsBySalesRow } from "./components/products-by-sales-row";
