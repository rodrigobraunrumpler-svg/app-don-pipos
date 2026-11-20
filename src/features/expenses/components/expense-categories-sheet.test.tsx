import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { renderWithProviders } from "@/test/render";

import { ExpenseCategoriesSheet } from "./expense-categories-sheet";

const mockSave = jest.fn();
const mockActive = jest.fn();
const INSUMOS = { id: "c1", name: "Insumos", icon: "basket-outline", isActive: true, sortOrder: 1, version: 3 };
const GAS = { id: "c2", name: "Gas", icon: "fire", isActive: false, sortOrder: 2, version: 1 };
jest.mock("../api/expenses", () => ({
  listExpenseCategories: async () => [INSUMOS, GAS],
  saveExpenseCategory: (input: unknown) => mockSave(input),
  setCategoryActive: (input: unknown) => mockActive(input),
}));

beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(INSUMOS);
  mockActive.mockReset().mockResolvedValue({ ...INSUMOS, isActive: false });
});

const open = () => renderWithProviders(<ExpenseCategoriesSheet onClose={jest.fn()} />);

test("la lista dice cuáles están apagados, y se agrega uno con su nombre y su ícono", async () => {
  await open();
  expect(screen.getByText("Los que eliges al anotar un gasto.")).toBeOnTheScreen();
  expect(await screen.findByRole("button", { name: "Insumos" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Gas, apagado" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Agregar tipo de gasto" }));
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText("Nombre del tipo de gasto"), " Empaques ");
  await fireEvent.press(screen.getByRole("button", { name: "Ícono: empaques" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(mockSave).toHaveBeenCalledWith({
      id: null,
      expectedVersion: null,
      name: "Empaques",
      icon: "package-variant-closed",
    }),
  );
  // Vuelve a la lista
  expect(await screen.findByRole("button", { name: "Agregar tipo de gasto" })).toBeOnTheScreen();
});

test("uno se renombra con su versión, y se apaga", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Insumos" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre del tipo de gasto"), "Insumos de cocina");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() =>
    expect(mockSave).toHaveBeenCalledWith({
      id: "c1",
      expectedVersion: 3,
      name: "Insumos de cocina",
      icon: "basket-outline",
    }),
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Insumos" }));
  await fireEvent.press(screen.getByRole("button", { name: "Apagar" }));
  await waitFor(() => expect(mockActive).toHaveBeenCalledWith({ id: "c1", expectedVersion: 3, active: false }));
});

test("un nombre que ya existe lo explica", async () => {
  mockSave.mockRejectedValueOnce(new AppError("conflict"));
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Agregar tipo de gasto" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre del tipo de gasto"), "insumos");
  await fireEvent.press(screen.getByRole("button", { name: "Ícono: insumos" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(await screen.findByText("Ya hay un tipo de gasto con ese nombre.")).toBeOnTheScreen();
});
