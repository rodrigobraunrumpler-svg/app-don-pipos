import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getLoyaltyOverview, getLoyaltySettings } from "../api/loyalty";
import { loyaltyKeys } from "./keys";

// La regla cambia poco; los sellos de los clientes, a cada entrega
export const loyaltySettingsQuery = queryOptions({
  queryKey: loyaltyKeys.settings,
  queryFn: getLoyaltySettings,
  staleTime: STALE_TIME.catalog,
});

export const loyaltyOverviewQuery = queryOptions({
  queryKey: loyaltyKeys.overview,
  queryFn: getLoyaltyOverview,
  staleTime: STALE_TIME.live,
});
