// Módulo cash: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { cashDifference, closedText, expectedCash } from "./rules/difference";
export type { CashCount, CashExpected } from "./schema/cash";
export { cashKeys } from "./queries/keys";
export { cashExpectedQuery, latestCashCountQuery } from "./queries/cash";
export { useCloseCashDay } from "./hooks/use-close-cash-day";
export { CashCountView } from "./components/cash-count-view";
