import { z } from "zod";

import { paymentMethodSchema } from "./order";

// El pedido a medio anotar, como se guarda en el celular. Se revisa al leerlo: uno de otra versión de la app que no
// calce se descarta
export const draftStateSchema = z.object({
  quantities: z.record(z.string(), z.number().int().min(0)),
  phone: z.string(),
  name: z.string(),
  fulfillment: z.enum(["pickup", "delivery"]),
  address: z.string(),
  scheduledFor: z.string().nullable(),
  promisedTime: z.string(),
  discountCents: z.number().int().min(0),
  discountReason: z.string(),
  paymentMode: z.enum(["none", "all", "part"]),
  paymentMethod: paymentMethodSchema.nullable(),
  paymentCents: z.number().int().min(0),
  note: z.string(),
  updatedAt: z.string().nullable(),
});
export type DraftState = z.infer<typeof draftStateSchema>;
