import { z } from "zod";

// Los gastos y sus tipos, como los devuelve la base (docs/spec/expenses.md §3). Las fechas quedan como texto ISO
export const paymentMethodSchema = z.enum(["cash", "yape", "plin", "transfer"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const expenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  version: z.number().int(),
});
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

export const expenseSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  categoryIcon: z.string(),
  description: z.string().nullable(),
  amountCents: z.number().int(),
  method: paymentMethodSchema,
  spentAt: z.string(),
  receiptPath: z.string().nullable(),
  previousAmountCents: z.number().int().nullable(),
  voidedAt: z.string().nullable(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const expensesSummarySchema = z.object({
  totalCents: z.number().int(),
  byCategory: z.array(
    z.object({ categoryId: z.string(), name: z.string(), icon: z.string(), totalCents: z.number().int() }),
  ),
});
export type ExpensesSummary = z.infer<typeof expensesSummarySchema>;
