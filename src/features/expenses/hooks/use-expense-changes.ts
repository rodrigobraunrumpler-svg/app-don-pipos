import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";

import { cashKeys } from "@/features/cash";

import { expensesKeys } from "../queries/keys";
import {
  type AttachPhotoInput,
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
// Subir la foto de un gasto. Al subir bien, se olvidan los intentos fallidos de ese mismo gasto
export function useAttachPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    ...attachPhotoMutation,
    meta,
    onSuccess: (_expense, variables) => {
      const cache = queryClient.getMutationCache();
      for (const failed of cache.findAll({ mutationKey: expensesKeys.attach, status: "error" }))
        if ((failed.state.variables as AttachPhotoInput | undefined)?.expenseId === variables.expenseId)
          cache.remove(failed);
    },
  });
}

// Las fotos que no se subieron (una por gasto), y reintentarlas todas con la misma foto
export function useFailedPhotos(): { count: number; retryAll: () => void } {
  const queryClient = useQueryClient();
  const attach = useAttachPhoto();
  const failed = useMutationState({
    filters: { mutationKey: expensesKeys.attach, status: "error" },
    select: (mutation) => mutation.state.variables as AttachPhotoInput,
  });
  const byExpense = [...new Map(failed.map((input) => [input.expenseId, input])).values()];
  function retryAll() {
    const cache = queryClient.getMutationCache();
    for (const old of cache.findAll({ mutationKey: expensesKeys.attach, status: "error" })) cache.remove(old);
    for (const input of byExpense) void attach.mutateAsync(input).catch(() => undefined);
  }
  return { count: byExpense.length, retryAll };
}
