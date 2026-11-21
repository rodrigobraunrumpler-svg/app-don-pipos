import { z } from "zod";

// Cómo va un alfajor en la web (private.product_json): solo en la app, le falta foto o descripción, espera la copia,
// subiendo, no se pudo subir (3 intentos), en la web, u oculto
export const WEB_STATES = ["none", "incomplete", "waiting", "pending", "failing", "sent", "hidden"] as const;
export type WebState = (typeof WEB_STATES)[number];

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
  // Lo de la web (fase 9). Con valores por defecto: un alfajor guardado antes llega sin ellos
  description: z.string().nullable().default(null),
  allergens: z.array(z.string()).default([]),
  hasPhoto: z.boolean().default(false),
  webSlug: z.string().nullable().default(null),
  isNew: z.boolean().default(false),
  webState: z.enum(WEB_STATES).default("none"),
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
  description?: string | null;
  allergens?: string[];
};
