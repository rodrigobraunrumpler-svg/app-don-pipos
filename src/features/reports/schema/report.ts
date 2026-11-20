import { z } from "zod";

// Inicio y reportes como los devuelve la base (docs/spec/reports.md §3). Las fechas quedan como texto AAAA-MM-DD o ISO
const cents = z.number().int();
const count = z.number().int();
const byMethodSchema = z.object({ cash: cents, yape: cents, plin: cents, transfer: cents });
export const paymentMethodSchema = z.enum(["cash", "yape", "plin", "transfer"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export const orderStatusSchema = z.enum(["new", "preparing", "on_the_way", "ready", "delivered", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const homeSummarySchema = z.object({
  collectedTodayCents: cents,
  collectedByMethod: byMethodSchema,
  deliveredToday: count,
  toDeliver: count,
  receivablesCents: cents,
  cashClosedToday: z.boolean(),
});
export type HomeSummary = z.infer<typeof homeSummarySchema>;

const totalsSchema = z.object({ incomeCents: cents, expensesCents: cents, profitCents: cents });
export const barSchema = z.object({ from: z.string(), to: z.string(), incomeCents: cents, expensesCents: cents });
export type Bar = z.infer<typeof barSchema>;
export const reportSummarySchema = totalsSchema.extend({
  previous: totalsSchema,
  bars: z.array(barSchema),
  byMethod: byMethodSchema,
});
export type ReportSummary = z.infer<typeof reportSummarySchema>;

export const rankingSchema = z.object({
  products: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      units: count,
      salesCents: cents,
      costCents: cents.nullable(),
      profitCents: cents.nullable(),
    }),
  ),
  channels: z.object({ whatsapp: count, local: count, web: count }),
  topCustomers: z.array(z.object({ customerId: z.string(), name: z.string(), orders: count, spentCents: cents })),
});
export type Ranking = z.infer<typeof rankingSchema>;

export const exportRowSchema = z.object({
  kind: z.enum(["order", "payment", "refund", "expense", "income"]),
  at: z.string(),
  orderNumber: count.nullable(),
  customerName: z.string().nullable(),
  detail: z.string().nullable(),
  method: paymentMethodSchema.nullable(),
  amountCents: cents,
  status: orderStatusSchema.nullable(),
});
export type ExportRow = z.infer<typeof exportRowSchema>;
export const exportRowsSchema = z.array(exportRowSchema);
