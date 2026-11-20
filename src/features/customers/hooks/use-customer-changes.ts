import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { customersKeys } from "../queries/keys";
import { anonymizeCustomerMutation, updateCustomerMutation } from "../queries/mutations";
import type { Customer } from "../schema/customer";

// Corregir sus datos se ve al instante (el interruptor de promociones, PROJECT_CONTEXT §14.2) y, si no se guarda, vuelve
// a como estaba; guardado, queda lo que devolvió la base. Refresca Clientes y la ficha; lo que se ve en otros módulos lo
// pide quien llama en `alsoRefresh` (customers no usa a nadie)
export function useUpdateCustomer(alsoRefresh: QueryKey[] = []) {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateCustomerMutation,
    meta: { invalidates: [customersKeys.all, ...alsoRefresh] },
    onMutate: async (input) => {
      const key = customersKeys.detail(input.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Customer>(key);
      if (previous)
        queryClient.setQueryData<Customer>(key, {
          ...previous,
          name: input.name.trim(),
          address: input.address.trim() || null,
          note: input.note.trim() || null,
          acceptsPromotions: input.acceptsPromotions,
        });
      return { previous };
    },
    onError: (_error, input, context) => {
      if (context?.previous) queryClient.setQueryData(customersKeys.detail(input.id), context.previous);
    },
    onSuccess: (saved) => queryClient.setQueryData(customersKeys.detail(saved.id), saved),
  });
}

// Borrar sus datos deja la ficha borrada al instante y saca del celular lo guardado con ellos (Ley 29733): lo buscado con
// su teléfono, las listas que no se están viendo y lo de `alsoRefresh` que no se está viendo. Lo que sí, se vuelve a pedir
export function useAnonymizeCustomer(alsoRefresh: QueryKey[] = []) {
  const queryClient = useQueryClient();
  return useMutation({
    ...anonymizeCustomerMutation,
    meta: { invalidates: [customersKeys.all, ...alsoRefresh] },
    onSuccess: (erased) => {
      const previous = queryClient.getQueryData<Customer>(customersKeys.detail(erased.id));
      queryClient.setQueryData(customersKeys.detail(erased.id), erased);
      if (previous?.phone) queryClient.removeQueries({ queryKey: customersKeys.byPhone(previous.phone) });
      queryClient.removeQueries({ queryKey: customersKeys.lists, type: "inactive" });
      for (const queryKey of alsoRefresh) queryClient.removeQueries({ queryKey, type: "inactive" });
    },
  });
}
