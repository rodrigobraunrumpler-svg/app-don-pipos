import { useMutation, type QueryKey } from "@tanstack/react-query";

import { customersKeys } from "../queries/keys";
import { anonymizeCustomerMutation, updateCustomerMutation } from "../queries/mutations";

// Corregir y borrar refrescan Clientes y la ficha. Lo que se ve en otros módulos (los pedidos con su nombre) lo pide quien
// llama en `alsoRefresh`: customers no usa a nadie
export const useUpdateCustomer = (alsoRefresh: QueryKey[] = []) =>
  useMutation({ ...updateCustomerMutation, meta: { invalidates: [customersKeys.all, ...alsoRefresh] } });

export const useAnonymizeCustomer = (alsoRefresh: QueryKey[] = []) =>
  useMutation({ ...anonymizeCustomerMutation, meta: { invalidates: [customersKeys.all, ...alsoRefresh] } });
