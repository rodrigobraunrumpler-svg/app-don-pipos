// Módulo income: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { incomeSaveLabel, incomeTitle } from "./rules/income";
export type { IncomeItem, IncomeSummary, ManualIncome } from "./schema/income";
export { incomeKeys } from "./queries/keys";
export { incomeQuery, incomeSummaryQuery } from "./queries/income";
export { useCreateManualIncome, useVoidManualIncome } from "./hooks/use-income-changes";
export { IncomeOverview } from "./components/income-overview";
export { IncomeForm } from "./components/income-form";
export { IncomeRow } from "./components/income-row";
