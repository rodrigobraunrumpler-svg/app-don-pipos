import { z } from "zod";

// Un texto de WhatsApp del negocio, como lo devuelve list_templates (docs/spec/messages.md)
export const templateSchema = z.object({
  key: z.enum(["confirmation", "on_the_way", "ready", "delivered", "balance_reminder", "we_miss_you"]),
  body: z.string(),
  version: z.number().int(),
  // Si es el texto original (para «Volver al texto original»)
  isDefault: z.boolean(),
});
export type Template = z.infer<typeof templateSchema>;
export const templateListSchema = z.array(templateSchema);
