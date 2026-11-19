import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getStockOverview } from "../api/stock";
import { stockKeys } from "./keys";

// El stock cambia a cada rato: fresco por 30 segundos
export const stockOverviewQuery = queryOptions({
  queryKey: stockKeys.overview,
  queryFn: getStockOverview,
  staleTime: STALE_TIME.live,
});
