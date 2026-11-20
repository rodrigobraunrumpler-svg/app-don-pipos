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
export {
  deliveryLabel,
  lapsedLabel,
  methodsLabel,
  productionLabel,
  productionNote,
  remindersLabel,
} from "./rules/settings-labels";
