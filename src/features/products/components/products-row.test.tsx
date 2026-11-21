import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { ProductsRow } from "./products-row";

jest.mock("../api/products", () => ({
  listProducts: async () =>
    [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }].map((item, index) => ({
      ...item,
      name: `Alfajor ${index}`,
      priceCents: 1200,
      costCents: null,
      minStock: 0,
      showOnWeb: true,
      isActive: true,
      sortOrder: index,
      imageUrl: null,
      linkedToWeb: false,
      version: 1,
    })),
  saveProduct: jest.fn(),
}));

test("la fila dice cuántos alfajores hay y lleva a la lista", async () => {
  const onPress = jest.fn();
  await renderWithProviders(<ProductsRow onPress={onPress} />);
  expect(await screen.findByText("5 alfajores")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Productos y precios, 5 alfajores" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
