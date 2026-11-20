import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AppError } from "@/lib/errors";
import { PIPO_ID, TEST_ORDER } from "@/test/orders";
import { renderWithProviders } from "@/test/render";
import { COQUETA_ID, LIMON_ID } from "@/test/stock-items";

import { EditOrderSheet } from "./edit-order-sheet";

const mockEdit = jest.fn();
jest.mock("../api/orders", () => ({ editOrder: (input: unknown) => mockEdit(input) }));
jest.mock("@/features/products/api/products", () => ({
  listProducts: async () => (jest.requireActual("@/test/products") as { TEST_PRODUCTS: unknown }).TEST_PRODUCTS,
}));

beforeEach(() => mockEdit.mockReset());

// El pedido de ejemplo: 2 Coquetas a S/ 12 y 1 Pipo Crush a S/ 13 (ya no está en el catálogo), delivery S/ 5,
// total S/ 42, pagado S/ 20, versión 1
const open = (onDone = jest.fn()) =>
  renderWithProviders(<EditOrderSheet order={TEST_ORDER} methods={["cash", "yape"]} onClose={jest.fn()} onDone={onDone} />);

test("editar manda la versión y las líneas, con el total nuevo a la vista", async () => {
  const updated = { ...TEST_ORDER, version: 2, totalCents: 5400 };
  mockEdit.mockResolvedValue(updated);
  const onDone = jest.fn();
  await open(onDone);
  expect(await screen.findByText("Lo que ya estaba conserva su precio; lo que agregues va al precio de hoy.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  await fireEvent.press(await screen.findByRole("button", { name: "Más Limon Kiss" }));
  expect(screen.getByText("Nuevo total: S/ 54.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith(updated));
  expect(mockEdit).toHaveBeenCalledWith({
    requestId: expect.any(String),
    orderId: TEST_ORDER.id,
    expectedVersion: 1,
    lines: [
      { productId: COQUETA_ID, quantity: 2 },
      { productId: PIPO_ID, quantity: 1 },
      { productId: LIMON_ID, quantity: 1 },
    ],
    refund: null,
  });
});

test("por debajo de lo pagado pide devolver la diferencia, con su medio", async () => {
  mockEdit.mockResolvedValue(TEST_ORDER);
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Menos Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Menos Coqueta" }));
  expect(screen.getByText("Nuevo total: S/ 18.00")).toBeOnTheScreen();
  expect(screen.getByText("Devuelves S/ 2.00: elige con qué.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Efectivo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() =>
    expect(mockEdit).toHaveBeenCalledWith(expect.objectContaining({ refund: { cents: 200, method: "cash" } })),
  );
});

test("sin alfajores no se guarda", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Menos Pipo Crush" }));
  await fireEvent.press(screen.getByRole("button", { name: "Menos Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Menos Coqueta" }));
  expect(screen.getByRole("button", { name: "Deja al menos un alfajor" })).toBeDisabled();
});

test("con un conflicto lo explica sin invitar a repetir", async () => {
  mockEdit.mockRejectedValueOnce(new AppError("conflict"));
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Más Coqueta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(
    await screen.findByText("Este pedido cambió mientras lo editabas. Ciérralo y vuelve a abrirlo para ver cómo quedó."),
  ).toBeOnTheScreen();
});
