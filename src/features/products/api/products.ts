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
    p_description: input.description ?? undefined,
    p_allergens: input.allergens ?? [],
  });
  if (error) throw toAppError(error);
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}

const PHOTOS = "product-photos";

// La foto del alfajor, ya achicada (base64 de un JPEG), en <negocio>/<alfajor>/<uuid>.jpg. Cada foto tiene su ruta:
// nunca se pisa una que la web ya está subiendo
export async function uploadProductPhoto(input: { path: string; base64: string }): Promise<void> {
  const bytes = Uint8Array.from(atob(input.base64), (char) => char.charCodeAt(0));
  const { error } = await supabase().storage.from(PHOTOS).upload(input.path, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw toAppError(error);
}

// Después de subirla: la anota en el alfajor, y la copia la lleva a la web
export async function setProductPhoto(productId: string, path: string): Promise<Product> {
  const { data, error } = await supabase().rpc("set_product_photo", { p_product_id: productId, p_path: path });
  if (error) throw toAppError(error);
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) throw new AppError("unexpected", { cause: parsed.error });
  return parsed.data;
}
