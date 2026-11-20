import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getBusiness } from "../api/business";
import { businessesKeys } from "./keys";

// Los ajustes cambian poco: frescos por 30 minutos
export const businessQuery = queryOptions({
  queryKey: businessesKeys.all,
  queryFn: getBusiness,
  staleTime: STALE_TIME.catalog,
});
