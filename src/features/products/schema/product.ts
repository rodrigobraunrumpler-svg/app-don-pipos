import { z } from "zod";

// Un producto como lo devuelve la base (private.product_json)
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceCents: z.number().int(),
  costCents: z.number().int().nullable(),
  minStock: z.number().int(),
  showOnWeb: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  imageUrl: z.string().nullable(),
  linkedToWeb: z.boolean(),
  version: z.number().int(),
});
export type Product = z.infer<typeof productSchema>;

export const productListSchema = z.array(productSchema);

// Lo que se manda al guardar: sin id ni versión, se crea; con los dos, se cambia
export type ProductInput = {
  id: string | null;
  expectedVersion: number | null;
  name: string;
  priceCents: number;
  costCents: number | null;
  minStock: number;
  showOnWeb: boolean;
};
