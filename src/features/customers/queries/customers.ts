import { queryOptions, skipToken } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { findCustomerByPhone } from "../api/customers";
import { customersKeys } from "./keys";

// Busca solo con el teléfono completo (null mientras no tenga sus 9 dígitos)
export const customerByPhoneQuery = (phone: string | null) =>
  queryOptions({
    queryKey: customersKeys.byPhone(phone ?? ""),
    queryFn: phone ? () => findCustomerByPhone(phone) : skipToken,
    staleTime: STALE_TIME.live,
  });
