import { AppError, toAppError } from "@/lib/errors";
import { orNull } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import { productListSchema, productSchema, type Product, type ProductInput } from "../schema/product";

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase().rpc("list_products");
  if (error) throw toAppError(error);
  const parsed = productListSchema.safeParse(data);
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase().rpc("save_product", {
    p_id: orNull(input.id),
    p_expected_version: orNull(input.expectedVersion),
    p_name: input.name,
    p_price_cents: input.priceCents,
    p_cost_cents: orNull(input.costCents),
    p_min_stock: input.minStock,
    p_show_on_web: input.showOnWeb,
  });
  if (error) throw toAppError(error);
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}
