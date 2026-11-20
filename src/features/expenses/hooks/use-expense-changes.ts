import { useMutation } from "@tanstack/react-query";

import { cashKeys } from "@/features/cash";

import { expensesKeys } from "../queries/keys";
import {
  attachPhotoMutation,
  correctExpenseMutation,
  createExpenseMutation,
  revertExpenseChangeMutation,
  saveExpenseCategoryMutation,
  setCategoryActiveMutation,
  voidExpenseMutation,
} from "../queries/mutations";

// Cada cambio de un gasto refresca los gastos y el cuadre de caja (lo gastado en efectivo del día). Todos esperan la
// respuesta: «Guardando…»
const meta = { invalidates: [expensesKeys.all, cashKeys.all] };

export const useCreateExpense = () => useMutation({ ...createExpenseMutation, meta });
export const useCorrectExpense = () => useMutation({ ...correctExpenseMutation, meta });
export const useVoidExpense = () => useMutation({ ...voidExpenseMutation, meta });
export const useRevertExpenseChange = () => useMutation({ ...revertExpenseChangeMutation, meta });
export const useSaveExpenseCategory = () => useMutation({ ...saveExpenseCategoryMutation, meta });
export const useSetCategoryActive = () => useMutation({ ...setCategoryActiveMutation, meta });
export const useAttachPhoto = () => useMutation({ ...attachPhotoMutation, meta });
