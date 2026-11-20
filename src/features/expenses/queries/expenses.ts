import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getExpensesSummary, listExpenseCategories, listExpenses, receiptUrl } from "../api/expenses";
import { expensesKeys } from "./keys";

// Los tipos cambian poco: frescos por 30 minutos
export const expenseCategoriesQuery = queryOptions({
  queryKey: expensesKeys.categories,
  queryFn: listExpenseCategories,
  staleTime: STALE_TIME.catalog,
});

// La lista por páginas de 20: pide la siguiente con el cursor de la anterior
export const expensesQuery = infiniteQueryOptions({
  queryKey: expensesKeys.list,
  queryFn: ({ pageParam }) => listExpenses({ cursor: pageParam }),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
  staleTime: STALE_TIME.live,
});

export const expensesSummaryQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: expensesKeys.summary(from, to),
    queryFn: () => getExpensesSummary({ from, to }),
    staleTime: STALE_TIME.live,
  });

// El enlace firmado de una boleta vale 10 minutos: a los 5 se pide otro
export const receiptUrlQuery = (path: string) =>
  queryOptions({
    queryKey: expensesKeys.receipt(path),
    queryFn: () => receiptUrl(path),
    staleTime: 5 * 60_000,
    gcTime: 9 * 60_000,
  });
