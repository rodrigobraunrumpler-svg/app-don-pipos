import { z } from "zod";

// El negocio con sus ajustes, como lo devuelve get_business (docs/spec/businesses.md §3). Por ahora la app usa los
// medios de pago activos y el costo del delivery; Ajustes llega en la fase 7
export const businessSchema = z.object({
  id: z.string(),
  name: z.string(),
  settings: z.object({
    activePaymentMethods: z.array(z.enum(["cash", "yape", "plin", "transfer"])),
    deliveryFeeCents: z.number().int(),
    version: z.number().int(),
  }),
});
export type Business = z.infer<typeof businessSchema>;
