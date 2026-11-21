import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { NewProductSheet } from "./new-product-sheet";

jest.mock("../api/products", () => ({ saveProduct: jest.fn() }));

test("la hoja de la puesta en marcha dice dónde se agregan después la foto y la descripción", async () => {
  await renderWithProviders(<NewProductSheet onClose={() => undefined} onSaved={() => undefined} />);
  expect(
    await screen.findByText("La foto y la descripción se agregan después, en Productos y precios."),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/panel de la web/)).toBeNull();
});
