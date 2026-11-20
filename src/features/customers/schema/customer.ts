import { z } from "zod";

// El cliente de un teléfono, como lo devuelve find_customer_by_phone (docs/spec/customers.md §3). Sin cliente, null
export const customerMatchSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    address: z.string().nullable(),
    ordersCount: z.number().int(),
    lastOrderAt: z.string().nullable(),
    stamps: z.number().int(),
    lastOrder: z.object({ lines: z.array(z.object({ productId: z.string(), quantity: z.number().int() })) }).nullable(),
  })
  .nullable();
export type CustomerMatch = z.infer<typeof customerMatchSchema>;
export type RepeatLine = { productId: string; quantity: number };

// Clientes: «Todos», «Los que más compran» y «No vuelven» (search_customers)
export const customerFilterSchema = z.enum(["all", "top", "lapsed"]);
export type CustomerFilter = z.infer<typeof customerFilterSchema>;

// Una fila de Clientes
export const customerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  ordersCount: z.number().int(),
  spentCents: z.number().int(),
  lastOrderAt: z.string().nullable(),
  acceptsPromotions: z.boolean(),
});
export type CustomerRow = z.infer<typeof customerRowSchema>;

// La ficha del cliente (get_customer). Borrado: sin teléfono ni datos, con anonymizedAt
export const customerSchema = customerRowSchema.extend({
  address: z.string().nullable(),
  note: z.string().nullable(),
  stamps: z.number().int(),
  favorite: z.object({ productId: z.string(), name: z.string() }).nullable(),
  anonymizedAt: z.string().nullable(),
  version: z.number().int(),
});
export type Customer = z.infer<typeof customerSchema>;
