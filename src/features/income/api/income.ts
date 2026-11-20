import { pageSchema, type Page } from "@/lib/page";
import { orNull, rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import {
  incomeItemSchema,
  incomeSummarySchema,
  manualIncomeSchema,
  type IncomeItem,
  type IncomeSummary,
  type ManualIncome,
  type PaymentMethod,
} from "../schema/income";

// Un ingreso a mano de hoy (receivedOn null) o de ayer («aaaa-mm-dd»)
export const createManualIncome = (input: {
  requestId: string;
  description: string;
  amountCents: number;
  method: PaymentMethod;
  receivedOn: string | null;
}): Promise<ManualIncome> =>
  rpcResult(
    manualIncomeSchema,
    supabase().rpc("create_manual_income", {
      p_request_id: input.requestId,
      p_description: input.description,
      p_amount_cents: input.amountCents,
      p_method: input.method,
      p_received_on: orNull(input.receivedOn),
    }),
  );

export const voidManualIncome = (input: { id: string; reason: string }): Promise<ManualIncome> =>
  rpcResult(manualIncomeSchema, supabase().rpc("void_manual_income", { p_id: input.id, p_reason: input.reason }));

export const getIncomeSummary = (input: { from: string; to: string }): Promise<IncomeSummary> =>
  rpcResult(incomeSummarySchema, supabase().rpc("income_summary", { p_from: input.from, p_to: input.to }));

// Los pagos y los ingresos a mano juntos, del más nuevo al más viejo; el cursor lo da la página anterior
export const listIncome = (input: { cursor: string | null }): Promise<Page<IncomeItem>> =>
  rpcResult(pageSchema(incomeItemSchema), supabase().rpc("list_income", { p_cursor: input.cursor ?? undefined }));
