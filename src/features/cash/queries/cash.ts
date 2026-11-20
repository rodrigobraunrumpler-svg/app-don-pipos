import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getCashExpected, getLatestCashCount } from "../api/cash";
import { cashKeys } from "./keys";

export const cashExpectedQuery = (businessDate: string) =>
  queryOptions({
    queryKey: cashKeys.expected(businessDate),
    queryFn: () => getCashExpected(businessDate),
    staleTime: STALE_TIME.live,
  });

export const latestCashCountQuery = (businessDate: string) =>
  queryOptions({
    queryKey: cashKeys.latest(businessDate),
    queryFn: () => getLatestCashCount(businessDate),
    staleTime: STALE_TIME.live,
  });
