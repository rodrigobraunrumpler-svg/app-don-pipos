// Módulo expenses: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { barShare, correctedText, expenseSaveLabel, monthRange } from "./rules/expense";
export type { Expense, ExpenseCategory, ExpensesSummary } from "./schema/expense";
export { expensesKeys } from "./queries/keys";
export { expenseCategoriesQuery, expensesQuery, expensesSummaryQuery, receiptUrlQuery } from "./queries/expenses";
export {
  useAttachPhoto,
  useCorrectExpense,
  useCreateExpense,
  useRevertExpenseChange,
  useSaveExpenseCategory,
  useSetCategoryActive,
  useVoidExpense,
} from "./hooks/use-expense-changes";
export { iconFor } from "./rules/category";
export { ExpenseCategoriesRow } from "./components/expense-categories-row";
export { ExpenseCategoriesSheet } from "./components/expense-categories-sheet";
