// Módulo loyalty: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { isRewardReady, rewardAmount } from "./rules/reward";
export { cardText, rewardLabel, stampsMessage } from "./rules/card";
export { loyaltyKeys } from "./queries/keys";
export { loyaltyOverviewQuery, loyaltySettingsQuery } from "./queries/loyalty";
export { useUpdateLoyaltySettings } from "./hooks/use-update-loyalty";
export type { LoyaltyRule, LoyaltySettings } from "./schema/loyalty";
export { StampsCard } from "./components/stamps-card";
export { LoyaltyScreen } from "./components/loyalty-screen";
export { LoyaltyRow } from "./components/loyalty-row";
