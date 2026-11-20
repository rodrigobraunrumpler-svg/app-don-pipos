import { rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import {
  exportRowsSchema,
  homeSummarySchema,
  rankingSchema,
  reportSummarySchema,
  type ExportRow,
  type HomeSummary,
  type Ranking,
  type ReportSummary,
} from "../schema/report";

// Lo de hoy para Inicio, en una sola consulta
export const getHomeSummary = (): Promise<HomeSummary> => rpcResult(homeSummarySchema, supabase().rpc("home_summary"));

// Ingresos, gastos y ganancia del periodo, comparados con el anterior que empieza en previousFrom (del mismo largo)
export const getReportSummary = (range: { from: string; to: string; previousFrom: string }): Promise<ReportSummary> =>
  rpcResult(
    reportSummarySchema,
    supabase().rpc("report_summary", { p_from: range.from, p_to: range.to, p_previous_from: range.previousFrom }),
  );

export const getRanking = (from: string, to: string): Promise<Ranking> =>
  rpcResult(rankingSchema, supabase().rpc("report_ranking", { p_from: from, p_to: to }));

// Lo que va al archivo de Excel: pedidos, pagos, devoluciones, gastos e ingresos del periodo (hasta un año)
export const getExportRows = (from: string, to: string): Promise<ExportRow[]> =>
  rpcResult(exportRowsSchema, supabase().rpc("export_rows", { p_from: from, p_to: to }));
