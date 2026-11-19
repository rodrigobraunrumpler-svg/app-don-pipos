import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { registerStockCountMutation, registerWasteMutation } from "../queries/mutations";
import { stockKeys } from "../queries/keys";
import { applyStockChanges } from "../rules/state";
import type { StockItem } from "../schema/stock";

type Changes = { productId: string; delta: number }[];

// Muestra el cambio en el stock al instante y devuelve cómo volver atrás si la base no lo guarda (§14.2)
async function showNow(queryClient: QueryClient, changes: (items: StockItem[]) => Changes) {
  await queryClient.cancelQueries({ queryKey: stockKeys.overview });
  const previous = queryClient.getQueryData<StockItem[]>(stockKeys.overview);
  if (previous) queryClient.setQueryData(stockKeys.overview, applyStockChanges(previous, changes(previous)));
  return { previous };
}

export function useRegisterWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    ...registerWasteMutation,
    onMutate: (input) => showNow(queryClient, () => [{ productId: input.productId, delta: -input.quantity }]),
    onError: (_error, _input, context) => queryClient.setQueryData(stockKeys.overview, context?.previous),
  });
}

export function useRegisterStockCount() {
  const queryClient = useQueryClient();
  return useMutation({
    ...registerStockCountMutation,
    onMutate: (input) =>
      showNow(queryClient, (items) =>
        input.counts.map(({ productId, counted }) => {
          const physical = items.find((item) => item.productId === productId)?.physical ?? counted;
          return { productId, delta: counted - physical };
        }),
      ),
    onError: (_error, _input, context) => queryClient.setQueryData(stockKeys.overview, context?.previous),
  });
}
