import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import { ExpenseForm } from "./expense-form";

const BUSINESS = "00000000-0000-4000-8000-0000000000b1";
const EXPENSE = {
  id: "00000000-0000-4000-8000-00000000f001",
  categoryId: "c1",
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
const PATH = `${BUSINESS}/${EXPENSE.id}.jpg`;

const mockCategories = jest.fn();
const mockCreate = jest.fn();
const mockUpload = jest.fn();
const mockAttach = jest.fn();
jest.mock("../api/expenses", () => ({
  listExpenseCategories: () => mockCategories(),
  createExpense: (input: unknown) => mockCreate(input),
  uploadReceipt: (input: unknown) => mockUpload(input),
  attachReceipt: (input: unknown) => mockAttach(input),
}));
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => ({
    id: "00000000-0000-4000-8000-0000000000b1",
    name: "Don Pipos (DEMO)",
    settings: { activePaymentMethods: ["cash", "yape"], deliveryFeeCents: 0, version: 1 },
  }),
}));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: async () => ({
    canceled: false,
    assets: [{ uri: "file:///boleta.jpg", width: 4000, height: 3000 }],
  }),
}));
jest.mock("@/lib/images", () => ({ shrinkPhoto: async () => "QUJD" }));

beforeEach(() => {
  mockCategories.mockReset().mockResolvedValue([
    { id: "c1", name: "Insumos", icon: "basket-outline", isActive: true, sortOrder: 1, version: 1 },
    { id: "c2", name: "Gas", icon: "fire", isActive: false, sortOrder: 2, version: 1 },
  ]);
  mockCreate.mockReset().mockResolvedValue(EXPENSE);
  mockUpload.mockReset().mockResolvedValue(undefined);
  mockAttach.mockReset().mockResolvedValue({ ...EXPENSE, receiptPath: PATH });
});

async function fillWithPhoto() {
  await renderWithProviders(<ExpenseForm onBack={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText("Monto del gasto en soles"), "86");
  await fireEvent.press(await screen.findByRole("button", { name: "Insumos" }));
  await fireEvent.changeText(screen.getByLabelText("En qué se gastó"), "Chocolate");
  await fireEvent.press(await screen.findByRole("button", { name: "Yape" }));
  await fireEvent.press(screen.getByRole("button", { name: "Tomar foto de la boleta" }));
  expect(await screen.findByText("Foto de la boleta")).toBeOnTheScreen();
}

test("guardar manda el gasto y después la foto achicada a su ruta; queda listo para el siguiente", async () => {
  await fillWithPhoto();
  // Un tipo apagado no se ofrece
  expect(screen.queryByRole("button", { name: "Gas" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto de S/ 86.00" }));
  await waitFor(() => expect(mockAttach).toHaveBeenCalledWith({ expenseId: EXPENSE.id, receiptPath: PATH }));
  expect(mockCreate).toHaveBeenCalledWith({
    requestId: expect.any(String),
    categoryId: "c1",
    amountCents: 8600,
    method: "yape",
    description: "Chocolate",
  });
  expect(mockUpload).toHaveBeenCalledWith({ path: PATH, base64: "QUJD" });
  expect(await screen.findByText("Foto de la boleta guardada.")).toBeOnTheScreen();
  expect(screen.getByLabelText("Monto del gasto en soles")).toHaveDisplayValue("");
  expect(screen.getByRole("button", { name: "Insumos" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Tomar foto de la boleta" })).toBeOnTheScreen();
});

test("si la foto no sube, el gasto queda y el aviso deja reintentar con la misma foto", async () => {
  let fail: (error: unknown) => void = () => undefined;
  mockUpload
    .mockReset()
    .mockImplementationOnce(() => new Promise((_resolve, reject) => (fail = reject)))
    .mockResolvedValueOnce(undefined);
  await fillWithPhoto();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto de S/ 86.00" }));
  // El gasto se confirma enseguida; la foto sigue subiendo
  expect(await screen.findByText("Gasto guardado: S/ 86.00. Subiendo la foto…")).toBeOnTheScreen();
  fail(new AppError("offline"));
  expect(await screen.findByText("La foto del gasto de S/ 86.00 no se subió.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Foto de la boleta guardada.")).toBeOnTheScreen();
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockUpload).toHaveBeenCalledTimes(2);
});

test("sin tipos de gasto, lo dice y abre la hoja para agregarlos", async () => {
  mockCategories.mockReset().mockResolvedValue([]);
  await renderWithProviders(<ExpenseForm onBack={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Agregar tipos de gasto" }));
  expect(await screen.findByText("Los que eliges al anotar un gasto.")).toBeOnTheScreen();
});

test("dos gastos con foto seguidos: si la primera foto falla después, igual lo dice", async () => {
  let fail: (error: unknown) => void = () => undefined;
  mockUpload
    .mockReset()
    .mockImplementationOnce(() => new Promise((_resolve, reject) => (fail = reject)))
    .mockResolvedValueOnce(undefined);
  mockCreate
    .mockReset()
    .mockResolvedValueOnce(EXPENSE)
    .mockResolvedValueOnce({ ...EXPENSE, id: "e2", amountCents: 4500 });
  await fillWithPhoto();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto de S/ 86.00" }));
  await fireEvent.changeText(screen.getByLabelText("Monto del gasto en soles"), "45");
  await fireEvent.press(screen.getByRole("button", { name: "Tomar foto de la boleta" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Guardar gasto de S/ 45.00" }));
  expect(await screen.findByText("Foto de la boleta guardada.")).toBeOnTheScreen();
  fail(new AppError("offline"));
  expect(await screen.findByText("La foto del gasto de S/ 86.00 no se subió.")).toBeOnTheScreen();
});

test("los tipos de gasto se cambian en Ajustes (Más ya no existe)", async () => {
  await renderWithProviders(<ExpenseForm onBack={jest.fn()} />);
  expect(await screen.findByText("Los tipos de gasto se cambian en Ajustes.")).toBeOnTheScreen();
});
