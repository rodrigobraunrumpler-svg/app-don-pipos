import { toAppError } from "@/lib/errors";
import { pageSchema, type Page } from "@/lib/page";
import { parseResponse as parse } from "@/lib/parse";
import { supabase } from "@/lib/supabase";

import {
  countResultSchema,
  movementSchema,
  productionResultSchema,
  productionSuggestionSchema,
  weekdaySalesSchema,
  revertResultSchema,
  stockOverviewSchema,
  wasteResultSchema,
  type CountInput,
  type CountResult,
  type Movement,
  type ProductionInput,
  type ProductionResult,
  type ProductionSuggestion,
  type WeekdaySales,
  type RevertResult,
  type StockItem,
  type WasteInput,
  type WasteResult,
} from "../schema/stock";

export async function getStockOverview(): Promise<StockItem[]> {
  const { data, error } = await supabase().rpc("stock_overview");
  if (error) throw toAppError(error);
  return parse(stockOverviewSchema, data);
}

// Una página del historial de un alfajor, del más nuevo al más viejo. El cursor lo da la página anterior
export async function listProductMovements(input: {
  productId: string;
  cursor: string | null;
}): Promise<Page<Movement>> {
  const { data, error } = await supabase().rpc("list_product_movements", {
    p_product_id: input.productId,
    p_cursor: input.cursor ?? undefined,
  });
  if (error) throw toAppError(error);
  return parse(pageSchema(movementSchema), data);
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

export async function getProductionSuggestion(): Promise<ProductionSuggestion> {
  const { data, error } = await supabase().rpc("production_suggestion");
  if (error) throw toAppError(error);
  return parse(productionSuggestionSchema, data);
}

export async function getProductSalesByWeekday(productId: string): Promise<WeekdaySales> {
  const { data, error } = await supabase().rpc("product_sales_by_weekday", { p_product_id: productId });
  if (error) throw toAppError(error);
  return parse(weekdaySalesSchema, data);
}
