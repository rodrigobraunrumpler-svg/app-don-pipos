import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { listProducts } from "../api/products";
import { productKeys } from "./keys";

// El catálogo cambia poco: fresco por 30 minutos
export const productsQuery = queryOptions({
  queryKey: productKeys.list,
  queryFn: listProducts,
  staleTime: STALE_TIME.catalog,
});
