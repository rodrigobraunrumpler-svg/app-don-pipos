import { infiniteQueryOptions, keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { findCustomerByPhone, getCustomer, searchCustomers } from "../api/customers";
import type { CustomerFilter } from "../schema/customer";
import { customersKeys } from "./keys";

// Busca solo con el teléfono completo (null mientras no tenga sus 9 dígitos)
export const customerByPhoneQuery = (phone: string | null) =>
  queryOptions({
    queryKey: customersKeys.byPhone(phone ?? ""),
    queryFn: phone ? () => findCustomerByPhone(phone) : skipToken,
    staleTime: STALE_TIME.live,
  });

// Clientes, de 20 en 20: pide la siguiente página con el cursor de la anterior. Al cambiar de filtro o de búsqueda, la
// lista de antes queda hasta que llega la nueva (sin parpadeo, PROJECT_CONTEXT §14.2)
export const customersQuery = (filter: CustomerFilter, search: string) =>
  infiniteQueryOptions({
    placeholderData: keepPreviousData,
    queryKey: customersKeys.list(filter, search),
    queryFn: ({ pageParam }) => searchCustomers({ filter, search, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    staleTime: STALE_TIME.live,
  });

export const customerQuery = (id: string) =>
  queryOptions({
    queryKey: customersKeys.detail(id),
    queryFn: () => getCustomer(id),
    staleTime: STALE_TIME.live,
  });
