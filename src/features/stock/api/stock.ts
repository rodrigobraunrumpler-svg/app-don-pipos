import { AppError, toAppError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

import { stockOverviewSchema, type StockItem } from "../schema/stock";

export async function getStockOverview(): Promise<StockItem[]> {
  const { data, error } = await supabase().rpc("stock_overview");
  if (error) throw toAppError(error);
  const parsed = stockOverviewSchema.safeParse(data);
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}
