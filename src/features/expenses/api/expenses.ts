import { toAppError } from "@/lib/errors";
import { pageSchema, type Page } from "@/lib/page";
import { orNull, rpcResult } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

import {
  expenseCategorySchema,
  expenseSchema,
  expensesSummarySchema,
  type Expense,
  type ExpenseCategory,
  type ExpensesSummary,
  type PaymentMethod,
} from "../schema/expense";

const BUCKET = "receipts";

export const listExpenseCategories = (): Promise<ExpenseCategory[]> =>
  rpcResult(expenseCategorySchema.array(), supabase().rpc("list_expense_categories"));

// Sin id crea un tipo nuevo; con id y la versión que se tenía, lo cambia
export const saveExpenseCategory = (input: {
  id: string | null;
  expectedVersion: number | null;
  name: string;
  icon: string;
}): Promise<ExpenseCategory> =>
  rpcResult(
    expenseCategorySchema,
    supabase().rpc("save_expense_category", {
      p_id: orNull(input.id),
      p_expected_version: orNull(input.expectedVersion),
      p_name: input.name,
      p_icon: input.icon,
    }),
  );

export const setCategoryActive = (input: { id: string; expectedVersion: number; active: boolean }) =>
  rpcResult(
    expenseCategorySchema,
    supabase().rpc("set_category_active", {
      p_id: input.id,
      p_expected_version: input.expectedVersion,
      p_active: input.active,
    }),
  );

// Un gasto de ahora (la base pone la fecha)
export const createExpense = (input: {
  requestId: string;
  categoryId: string;
  amountCents: number;
  method: PaymentMethod;
  description: string;
}): Promise<Expense> =>
  rpcResult(
    expenseSchema,
    supabase().rpc("create_expense", {
      p_request_id: input.requestId,
      p_category_id: input.categoryId,
      p_amount_cents: input.amountCents,
      p_method: input.method,
      p_description: input.description,
      p_spent_at: orNull<string>(null),
    }),
  );

export const attachReceipt = (input: { expenseId: string; receiptPath: string }): Promise<Expense> =>
  rpcResult(
    expenseSchema,
    supabase().rpc("attach_receipt", { p_expense_id: input.expenseId, p_receipt_path: input.receiptPath }),
  );

export const correctExpense = (input: {
  requestId: string;
  id: string;
  categoryId: string;
  amountCents: number;
  method: PaymentMethod;
  description: string;
}): Promise<Expense> =>
  rpcResult(
    expenseSchema,
    supabase().rpc("correct_expense", {
      p_request_id: input.requestId,
      p_id: input.id,
      p_category_id: input.categoryId,
      p_amount_cents: input.amountCents,
      p_method: input.method,
      p_description: input.description,
    }),
  );

export const voidExpense = (input: { id: string; reason: string }): Promise<Expense> =>
  rpcResult(expenseSchema, supabase().rpc("void_expense", { p_id: input.id, p_reason: input.reason }));

export const revertExpenseChange = (expenseId: string): Promise<Expense> =>
  rpcResult(expenseSchema, supabase().rpc("revert_expense_change", { p_expense_id: expenseId }));

// Los que cuentan, del más nuevo al más viejo; el cursor lo da la página anterior
export const listExpenses = (input: { cursor: string | null }): Promise<Page<Expense>> =>
  rpcResult(pageSchema(expenseSchema), supabase().rpc("list_expenses", { p_cursor: input.cursor ?? undefined }));

export const getExpensesSummary = (input: { from: string; to: string }): Promise<ExpensesSummary> =>
  rpcResult(expensesSummarySchema, supabase().rpc("expenses_summary", { p_from: input.from, p_to: input.to }));

// La foto ya achicada, en «<negocio>/<gasto>.jpg» del bucket privado. Reemplaza si ya estaba (un reintento)
export async function uploadReceipt(input: { path: string; base64: string }): Promise<void> {
  const bytes = Uint8Array.from(atob(input.base64), (char) => char.charCodeAt(0));
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(input.path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw toAppError(error);
}

// Para verla: un enlace firmado que vale 10 minutos
export async function receiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(path, 600);
  if (error) throw toAppError(error);
  return data.signedUrl;
}
