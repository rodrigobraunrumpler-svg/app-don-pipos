import type { z } from "zod";

import { AppError, toAppError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

import {
  countResultSchema,
  productionResultSchema,
  revertResultSchema,
  stockOverviewSchema,
  wasteResultSchema,
  type CountInput,
  type CountResult,
  type ProductionInput,
  type ProductionResult,
  type RevertResult,
  type StockItem,
  type WasteInput,
  type WasteResult,
} from "../schema/stock";

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}

export async function getStockOverview(): Promise<StockItem[]> {
  const { data, error } = await supabase().rpc("stock_overview");
  if (error) throw toAppError(error);
  return parse(stockOverviewSchema, data);
}

export async function registerProduction(input: ProductionInput): Promise<ProductionResult> {
  const { data, error } = await supabase().rpc("register_production", {
    p_request_id: input.requestId,
    p_items: input.items,
  });
  if (error) throw toAppError(error);
  return parse(productionResultSchema, data);
}

export async function registerWaste(input: WasteInput): Promise<WasteResult> {
  const { data, error } = await supabase().rpc("register_waste", {
    p_request_id: input.requestId,
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_reason: input.reason,
  });
  if (error) throw toAppError(error);
  return parse(wasteResultSchema, data);
}

export async function registerStockCount(input: CountInput): Promise<CountResult> {
  const { data, error } = await supabase().rpc("register_stock_count", {
    p_request_id: input.requestId,
    p_counts: input.counts,
  });
  if (error) throw toAppError(error);
  return parse(countResultSchema, data);
}

export async function revertStockChange(requestId: string): Promise<RevertResult> {
  const { data, error } = await supabase().rpc("revert_stock_change", { p_request_id: requestId });
  if (error) throw toAppError(error);
  return parse(revertResultSchema, data);
}
