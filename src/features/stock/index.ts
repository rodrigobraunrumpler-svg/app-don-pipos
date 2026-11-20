// Módulo stock: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { countSaveLabel, differenceLabel, expectedLabel } from "./rules/count";
export { stockLine } from "./rules/coverage";
export { movementLabel, movementTime } from "./rules/movement";
export { productionSavedText, productionSaveLabel, productionTotal } from "./rules/production";
export { suggestedTotal, suggestionTitle, upToDateText } from "./rules/suggestion";
export type { MovementKind, StockState, WasteReason } from "./schema/stock";
export { StockOverview } from "./components/stock-overview";
export { productionSuggestionQuery, stockOverviewQuery, weekdaySalesQuery } from "./queries/stock";
export type { StockItem } from "./schema/stock";
export { ProductionForm } from "./components/production-form";
export { ProductStock } from "./components/product-stock";
export { stockKeys } from "./queries/keys";
