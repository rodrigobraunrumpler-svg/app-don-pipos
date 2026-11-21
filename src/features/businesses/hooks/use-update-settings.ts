import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customersKeys } from "@/features/customers";
import { stockKeys } from "@/features/stock";

import { businessesKeys } from "../queries/keys";
import { updateSettingsMutation } from "../queries/mutations";
import type { Business } from "../schema/business";

// Un ajuste cambia al instante (un interruptor no espera a la señal, PROJECT_CONTEXT §14.2) y, si no se guarda, vuelve a
// como estaba; guardado, queda lo que devolvió la base. Refresca el stock (cada cuántos días produce cambia la sugerencia)
// y los clientes (los días de «No vuelven» cambian esa lista, que está justo debajo en Pedidos › Clientes)
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateSettingsMutation(queryClient),
    meta: { invalidates: [businessesKeys.all, stockKeys.all, customersKeys.all] },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: businessesKeys.all });
      const previous = queryClient.getQueryData<Business>(businessesKeys.all);
      if (previous)
        queryClient.setQueryData<Business>(businessesKeys.all, {
          ...previous,
          settings: { ...previous.settings, ...patch },
        });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(businessesKeys.all, context.previous);
    },
    onSuccess: (settings) =>
      queryClient.setQueryData<Business>(businessesKeys.all, (business) => business && { ...business, settings }),
  });
}
