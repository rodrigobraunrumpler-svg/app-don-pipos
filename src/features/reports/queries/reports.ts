import { queryOptions } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query";

import { getExportRows, getHomeSummary, getRanking, getReportSummary } from "../api/reports";
import { reportsKeys } from "./keys";

// Inicio está vivo: cobros y entregas cambian a cada rato. Ningún otro módulo refresca estas consultas (usarían
// reports y habría un ciclo): Inicio y Reportes las piden de nuevo al volver a la pantalla (useRefreshOnFocus)
export const homeSummaryQuery = queryOptions({
  queryKey: reportsKeys.home(),
  queryFn: getHomeSummary,
  staleTime: STALE_TIME.live,
});

export const reportSummaryQuery = ({ from, to, previousFrom }: { from: string; to: string; previousFrom: string }) =>
  queryOptions({
    queryKey: reportsKeys.summary(from, to, previousFrom),
    queryFn: () => getReportSummary({ from, to, previousFrom }),
    staleTime: STALE_TIME.reports,
  });

export const rankingQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: reportsKeys.ranking(from, to),
    queryFn: () => getRanking(from, to),
    staleTime: STALE_TIME.reports,
  });

// Un año de filas no se guarda en el celular ni se queda en memoria: se piden al exportar y se sueltan
export const exportRowsQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: reportsKeys.exportRows(from, to),
    queryFn: () => getExportRows(from, to),
    staleTime: 0,
    gcTime: 0,
    meta: { persist: false },
    // Sin señal falla al momento (como los guardados) en vez de quedar en espera
    networkMode: "always",
  });
