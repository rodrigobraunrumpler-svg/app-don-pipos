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
  // «Otra fecha» tal como se escribió (día/mes), para avisar si no es una fecha
  otherDay: z.string(),
  promisedTime: z.string(),
  discountCents: z.number().int().min(0),
  discountReason: z.string(),
  paymentMode: z.enum(["none", "all", "part"]),
  paymentMethod: paymentMethodSchema.nullable(),
  paymentCents: z.number().int().min(0),
  note: z.string(),
  // El código del pedido: el mismo en cada reintento, aunque se cierre la app; se renueva al guardar o con un conflicto
  requestId: z.string(),
  updatedAt: z.string().nullable(),
});
export type DraftState = z.infer<typeof draftStateSchema>;
