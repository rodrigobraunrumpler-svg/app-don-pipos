import { z } from "zod";

// El cliente de un teléfono, como lo devuelve find_customer_by_phone (docs/spec/customers.md §3). Sin cliente, null
export const customerMatchSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    address: z.string().nullable(),
    ordersCount: z.number().int(),
    lastOrderAt: z.string().nullable(),
    lastOrder: z.object({ lines: z.array(z.object({ productId: z.string(), quantity: z.number().int() })) }).nullable(),
  })
  .nullable();
export type CustomerMatch = z.infer<typeof customerMatchSchema>;
export type RepeatLine = { productId: string; quantity: number };
