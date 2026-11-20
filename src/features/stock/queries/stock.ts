import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import {
  getProductionSuggestion,
  getProductSalesByWeekday,
  getStockOverview,
  listProductMovements,
} from "../api/stock";
import { stockKeys } from "./keys";

// El stock cambia a cada rato: fresco por 30 segundos
export const stockOverviewQuery = queryOptions({
  queryKey: stockKeys.overview,
  queryFn: getStockOverview,
  staleTime: STALE_TIME.live,
});

// El historial de un alfajor, por páginas: pide la siguiente con el cursor de la anterior (§14.3).
// Sin maxPages: sin getPreviousPageParam, la primera página que se suelte desaparecería de la lista al bajar
export const productMovementsQuery = (productId: string) =>
  infiniteQueryOptions({
    queryKey: stockKeys.movements(productId),
    queryFn: ({ pageParam }) => listProductMovements({ productId, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    staleTime: STALE_TIME.live,
  });

// La sugerencia cambia con cada venta y producción, como el stock
export const productionSuggestionQuery = queryOptions({
  queryKey: stockKeys.suggestion,
  queryFn: getProductionSuggestion,
  staleTime: STALE_TIME.live,
});

// «Cómo se vende» mira 4 semanas: fresco por 5 minutos
export const weekdaySalesQuery = (productId: string) =>
  queryOptions({
    queryKey: stockKeys.weekdaySales(productId),
    queryFn: () => getProductSalesByWeekday(productId),
    staleTime: STALE_TIME.reports,
  });
