import { z } from "zod";

import { PAYMENT_METHODS } from "./payment-method";

// Los avisos del celular que el dueño deja encendidos (docs/spec/reminders.md)
export const reminderSettingsSchema = z.object({ scheduled: z.boolean(), stock: z.boolean(), balances: z.boolean() });
export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;

// Los ajustes del negocio, como los devuelven get_business y update_settings (docs/spec/businesses.md §3)
export const businessSettingsSchema = z.object({
  activePaymentMethods: z.array(z.enum(PAYMENT_METHODS)),
  deliveryFeeCents: z.number().int(),
  deliveryZone: z.string().nullable(),
  productionIntervalDays: z.number().int(),
  lapsedAfterDays: z.number().int(),
  reminders: reminderSettingsSchema,
  // Fase 9: los alfajores de la web por lo más vendido del mes, y el enlace para pedir reseñas en Google
  productsBySales: z.boolean().default(false),
  reviewUrl: z.string().nullable().default(null),
  version: z.number().int(),
});
export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
// Lo que se cambia: uno o varios ajustes, nunca la versión
export type SettingsPatch = Partial<Omit<BusinessSettings, "version">>;

// El negocio con sus ajustes y si falta la puesta en marcha
export const businessSchema = z.object({
  id: z.string(),
  name: z.string(),
  modules: z.array(z.string()),
  setupDone: z.boolean(),
  settings: businessSettingsSchema,
});
export type Business = z.infer<typeof businessSchema>;

// La puesta en marcha: el stock de hoy de cada alfajor y los tipos de gasto elegidos, con su código de pedido
export type SetupInput = {
  requestId: string;
  stock: { productId: string; counted: number }[];
  categories: { name: string; icon: string }[];
};
export const setupResultSchema = z.object({ adjustments: z.number().int(), categories: z.number().int() });
export type SetupResult = z.infer<typeof setupResultSchema>;
