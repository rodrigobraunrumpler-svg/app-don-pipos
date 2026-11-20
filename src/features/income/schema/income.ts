import { z } from "zod";

// Los ingresos como los devuelve la base (docs/spec/income.md §3). Las fechas quedan como texto ISO
export const paymentMethodSchema = z.enum(["cash", "yape", "plin", "transfer"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const manualIncomeSchema = z.object({
  id: z.string(),
  description: z.string(),
  amountCents: z.number().int(),
  method: paymentMethodSchema,
  receivedAt: z.string(),
  voidedAt: z.string().nullable(),
});
export type ManualIncome = z.infer<typeof manualIncomeSchema>;

// Una fila de la lista: un pago o una devolución con su pedido, o un ingreso a mano con su descripción
export const incomeItemSchema = z.object({
  kind: z.enum(["payment", "refund", "manual"]),
  id: z.string(),
  at: z.string(),
  amountCents: z.number().int(),
  method: paymentMethodSchema,
  orderId: z.string().nullable(),
  orderNumber: z.number().int().nullable(),
  customerName: z.string().nullable(),
  description: z.string().nullable(),
});
export type IncomeItem = z.infer<typeof incomeItemSchema>;

export const incomeSummarySchema = z.object({
  totalCents: z.number().int(),
  byMethod: z.object({
    cash: z.number().int(),
    yape: z.number().int(),
    plin: z.number().int(),
    transfer: z.number().int(),
  }),
  byDay: z.array(z.object({ day: z.string(), totalCents: z.number().int() })),
});
export type IncomeSummary = z.infer<typeof incomeSummarySchema>;
