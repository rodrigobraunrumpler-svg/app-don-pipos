import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getIncomeSummary, listIncome } from "../api/income";
import { incomeKeys } from "./keys";

// La lista por páginas de 20: pide la siguiente con el cursor de la anterior
export const incomeQuery = infiniteQueryOptions({
  queryKey: incomeKeys.list,
  queryFn: ({ pageParam }) => listIncome({ cursor: pageParam }),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
  staleTime: STALE_TIME.live,
});

export const incomeSummaryQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: incomeKeys.summary(from, to),
    queryFn: () => getIncomeSummary({ from, to }),
    staleTime: STALE_TIME.live,
  });
