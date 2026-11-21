import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import { ExpensesOverview } from "./expenses-overview";

const BUSINESS = "00000000-0000-4000-8000-0000000000b1";
const now = new Date();
const base = {
  categoryId: "c1",
  categoryName: "Insumos",
  categoryIcon: "basket-outline",
  method: "yape",
  spentAt: now.toISOString(),
  receiptPath: null,
  previousAmountCents: null,
  voidedAt: null,
};
const CHOCOLATE = { ...base, id: "e1", description: "Chocolate", amountCents: 8600 };
const CAJAS = {
  ...base,
  id: "e2",
  categoryId: "c2",
  categoryName: "Empaques",
  categoryIcon: "package-variant-closed",
  description: null,
  amountCents: 4500,
  method: "cash",
  previousAmountCents: 4000,
};

const mockCorrect = jest.fn();
const mockVoid = jest.fn();
const mockRevert = jest.fn();
const mockUpload = jest.fn();
const mockAttach = jest.fn();
jest.mock("../api/expenses", () => ({
  listExpenses: async () => ({
    items: mockItems.none ? [] : [mockItems.chocolate, mockItems.cajas],
    meta: { limit: 20, total: mockItems.none ? 0 : 2, hasMore: false, nextCursor: null },
  }),
  getExpensesSummary: async () => ({
    totalCents: 13100,
    byCategory: [
      { categoryId: "c1", name: "Insumos", icon: "basket-outline", totalCents: 8600 },
      { categoryId: "c2", name: "Empaques", icon: "package-variant-closed", totalCents: 4500 },
    ],
  }),
  listExpenseCategories: async () => [
    { id: "c1", name: "Insumos", icon: "basket-outline", isActive: true, sortOrder: 1, version: 1 },
    { id: "c2", name: "Empaques", icon: "package-variant-closed", isActive: true, sortOrder: 2, version: 1 },
  ],
  correctExpense: (input: unknown) => mockCorrect(input),
  voidExpense: (input: unknown) => mockVoid(input),
  revertExpenseChange: (id: string) => mockRevert(id),
  uploadReceipt: (input: unknown) => mockUpload(input),
  attachReceipt: (input: unknown) => mockAttach(input),
  receiptUrl: async () => "https://firmado/boleta.jpg",
}));
const mockItems: { chocolate: unknown; cajas: unknown; none: boolean } = {
  chocolate: CHOCOLATE,
  cajas: CAJAS,
  none: false,
};
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
  mockItems.none = false;
  mockCorrect.mockReset().mockResolvedValue({ ...CHOCOLATE, id: "e3", amountCents: 9000, previousAmountCents: 8600 });
  mockVoid.mockReset().mockResolvedValue({ ...CHOCOLATE, voidedAt: now.toISOString() });
  mockRevert.mockReset().mockResolvedValue(CHOCOLATE);
  mockUpload.mockReset().mockResolvedValue(undefined);
  mockAttach.mockReset().mockResolvedValue({ ...CHOCOLATE, receiptPath: `${BUSINESS}/e1.jpg` });
});

const open = () => renderWithProviders(<ExpensesOverview onBack={jest.fn()} onNew={jest.fn()} />);

test("el mes con sus barras por tipo y los gastos con su línea", async () => {
  await open();
  expect(await screen.findByText("S/ 131.00")).toBeOnTheScreen();
  expect(screen.getByText(/^Gastado en /)).toBeOnTheScreen();
  expect(await screen.findByText("Chocolate")).toBeOnTheScreen();
  expect(screen.getByText(/^Hoy, \d\d:\d\d, Yape$/)).toBeOnTheScreen();
  expect(screen.getByText("Corregido, antes S/ 40.00")).toBeOnTheScreen();
  expect(screen.getByText("Toca un gasto para corregirlo o anularlo.")).toBeOnTheScreen();
});

test("corregir manda los cambios y «Deshacer» deshace la corrección una sola vez", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: /^Chocolate/ }));
  expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Monto del gasto en soles"), "90");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar corrección" }));
  await waitFor(() =>
    expect(mockCorrect).toHaveBeenCalledWith({
      requestId: expect.any(String),
      id: "e1",
      categoryId: "c1",
      amountCents: 9000,
      method: "yape",
      description: "Chocolate",
    }),
  );
  expect(await screen.findByText("Gasto corregido: S/ 90.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
  expect(await screen.findByText("Se deshizo el cambio.")).toBeOnTheScreen();
  expect(mockRevert).toHaveBeenCalledTimes(1);
  expect(mockRevert).toHaveBeenCalledWith("e3");
});

test("anular y deshacer", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: /^Chocolate/ }));
  await fireEvent.press(screen.getByRole("button", { name: "Anular gasto" }));
  await waitFor(() => expect(mockVoid).toHaveBeenCalledWith({ id: "e1", reason: "Anulado por el dueño" }));
  expect(await screen.findByText("Gasto anulado")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
  await waitFor(() => expect(mockRevert).toHaveBeenCalledWith("e1"));
});

test("la foto de la boleta también se agrega después, desde la hoja del gasto", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: /^Chocolate/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Agregar foto de la boleta" })).toBeEnabled());
  await fireEvent.press(screen.getByRole("button", { name: "Agregar foto de la boleta" }));
  await waitFor(() => expect(mockAttach).toHaveBeenCalledWith({ expenseId: "e1", receiptPath: `${BUSINESS}/e1.jpg` }));
  expect(mockUpload).toHaveBeenCalledWith({ path: `${BUSINESS}/e1.jpg`, base64: "QUJD" });
  expect(await screen.findByText("Foto de la boleta guardada.")).toBeOnTheScreen();
});

test("una foto que no se subió queda avisada en Gastos, con «Reintentar», aunque se cierre la hoja", async () => {
  mockUpload.mockReset().mockRejectedValueOnce(new AppError("offline")).mockResolvedValueOnce(undefined);
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: /^Chocolate/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Agregar foto de la boleta" })).toBeEnabled());
  await fireEvent.press(screen.getByRole("button", { name: "Agregar foto de la boleta" }));
  expect(await screen.findByText("Sin conexión. Revisa tu señal y vuelve a intentar.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
  expect(await screen.findByText("La foto de 1 gasto no se subió.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Reintentar las fotos" }));
  await waitFor(() => expect(mockAttach).toHaveBeenCalledWith({ expenseId: "e1", receiptPath: `${BUSINESS}/e1.jpg` }));
  await waitFor(() => expect(screen.queryByText("La foto de 1 gasto no se subió.")).toBeNull());
});

test("arriba de los gastos, «Tipos de gasto» abre su hoja", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Tipos de gasto, 2 tipos" }));
  expect(await screen.findByText("Los que eliges al anotar un gasto.")).toBeOnTheScreen();
});

test("sin ningún gasto todavía, «Tipos de gasto» igual está arriba", async () => {
  mockItems.none = true;
  await open();
  expect(await screen.findByText("Todavía no hay gastos este mes")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Tipos de gasto, 2 tipos" })).toBeOnTheScreen();
});
