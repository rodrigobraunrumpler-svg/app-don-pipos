import { mutationOptions } from "@tanstack/react-query";

import { shrinkPhoto } from "@/lib/images";

import {
  attachReceipt,
  correctExpense,
  createExpense,
  revertExpenseChange,
  saveExpenseCategory,
  setCategoryActive,
  uploadReceipt,
  voidExpense,
} from "../api/expenses";
import { expensesKeys } from "./keys";

export type AttachPhotoInput = {
  businessId: string;
  expenseId: string;
  photo: { uri: string; width: number; height: number };
};

// Qué refresca cada cambio lo ponen los hooks, que ven los otros módulos
export const createExpenseMutation = mutationOptions({ mutationFn: createExpense });
export const correctExpenseMutation = mutationOptions({ mutationFn: correctExpense });
export const voidExpenseMutation = mutationOptions({ mutationFn: voidExpense });
export const revertExpenseChangeMutation = mutationOptions({ mutationFn: revertExpenseChange });
export const saveExpenseCategoryMutation = mutationOptions({ mutationFn: saveExpenseCategory });
export const setCategoryActiveMutation = mutationOptions({ mutationFn: setCategoryActive });

// La foto de la boleta: se achica, se sube a la ruta del gasto y queda anotada en él. Reintentar vuelve a subirla.
// Una que falla queda en la caché un día (no 5 minutos): Gastos la avisa con «Reintentar»
export const attachPhotoMutation = mutationOptions({
  mutationKey: expensesKeys.attach,
  gcTime: 24 * 60 * 60_000,
  mutationFn: async (input: AttachPhotoInput) => {
    const path = `${input.businessId}/${input.expenseId}.jpg`;
    await uploadReceipt({ path, base64: await shrinkPhoto(input.photo) });
    return attachReceipt({ expenseId: input.expenseId, receiptPath: path });
  },
});
