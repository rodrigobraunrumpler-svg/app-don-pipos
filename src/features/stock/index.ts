// Módulo stock: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { countSaveLabel, differenceLabel, expectedLabel } from "./rules/count";
export { stockLine } from "./rules/coverage";
export { movementLabel, movementTime } from "./rules/movement";
export { productionSavedText, productionSaveLabel, productionTotal } from "./rules/production";
export type { MovementKind, StockState, WasteReason } from "./schema/stock";
export { StockOverview } from "./components/stock-overview";
export { stockOverviewQuery } from "./queries/stock";
export type { StockItem } from "./schema/stock";
