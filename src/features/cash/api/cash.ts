import { rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import { cashCountSchema, cashExpectedSchema, type CashCount, type CashExpected } from "../schema/cash";

// Lo cobrado y lo gastado en efectivo de ese día de Lima, los otros medios y con cuánto abrió el último cierre
export const getCashExpected = (businessDate: string): Promise<CashExpected> =>
  rpcResult(cashExpectedSchema, supabase().rpc("cash_expected", { p_business_date: businessDate }));

// Cierra el día (o vuelve a contar): la base hace la cuenta con lo de ese momento
export const closeCashDay = (input: {
  requestId: string;
  businessDate: string;
  openingCents: number;
  countedCents: number;
}): Promise<CashCount> =>
  rpcResult(
    cashCountSchema,
    supabase().rpc("close_cash_day", {
      p_request_id: input.requestId,
      p_business_date: input.businessDate,
      p_opening_cents: input.openingCents,
      p_counted_cents: input.countedCents,
    }),
  );

// El último cierre de ese día, o null si no se cerró
export const getLatestCashCount = (businessDate: string): Promise<CashCount | null> =>
  rpcResult(cashCountSchema.nullable(), supabase().rpc("latest_cash_count", { p_business_date: businessDate }));
