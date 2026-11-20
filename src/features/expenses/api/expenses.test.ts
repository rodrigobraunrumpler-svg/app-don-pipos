import { createExpense, listExpenses, receiptUrl, uploadReceipt } from "./expenses";

const mockRpc = jest.fn();
const mockUpload = jest.fn();
const mockSign = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: () => ({
    rpc: mockRpc,
    storage: { from: () => ({ upload: mockUpload, createSignedUrl: mockSign }) },
  }),
}));

const EXPENSE = {
  id: "00000000-0000-4000-8000-00000000f001",
  categoryId: "00000000-0000-4000-8000-00000000f101",
  categoryName: "Insumos",
  categoryIcon: "basket-outline",
  description: "Chocolate",
  amountCents: 8600,
  method: "yape",
  spentAt: "2026-11-19T14:10:00.000Z",
  receiptPath: null,
  previousAmountCents: null,
  voidedAt: null,
};

test("un gasto se anota sin fecha (la pone la base) y llega revisado con su esquema", async () => {
  mockRpc.mockResolvedValueOnce({ data: EXPENSE, error: null });
  const input = {
    requestId: "r1",
    categoryId: EXPENSE.categoryId,
    amountCents: 8600,
    method: "yape" as const,
    description: "Chocolate",
  };
  await expect(createExpense(input)).resolves.toEqual(EXPENSE);
  expect(mockRpc).toHaveBeenCalledWith("create_expense", {
    p_request_id: "r1",
    p_category_id: EXPENSE.categoryId,
    p_amount_cents: 8600,
    p_method: "yape",
    p_description: "Chocolate",
    p_spent_at: null,
  });
  mockRpc.mockResolvedValueOnce({ data: { items: [{ ...EXPENSE, amountCents: "86" }], meta: {} }, error: null });
  await expect(listExpenses({ cursor: null })).rejects.toMatchObject({ kind: "unexpected" });
});

test("la boleta sube como JPEG a su ruta y se ve con un enlace firmado", async () => {
  mockUpload.mockResolvedValueOnce({ data: {}, error: null });
  await uploadReceipt({ path: "b/e.jpg", base64: "QUJD" });
  expect(mockUpload).toHaveBeenCalledWith("b/e.jpg", new Uint8Array([65, 66, 67]), {
    contentType: "image/jpeg",
    upsert: true,
  });
  mockSign.mockResolvedValueOnce({ data: { signedUrl: "https://firmado" }, error: null });
  await expect(receiptUrl("b/e.jpg")).resolves.toBe("https://firmado");
  expect(mockSign).toHaveBeenCalledWith("b/e.jpg", 600);
  mockUpload.mockResolvedValueOnce({ data: null, error: new Error("Network request failed") });
  await expect(uploadReceipt({ path: "b/e.jpg", base64: "QUJD" })).rejects.toMatchObject({ kind: "offline" });
});
