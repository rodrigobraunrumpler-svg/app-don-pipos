import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { NewMenu } from "./new-menu";

test("el + ofrece anotar un pedido, una venta, la producción, un gasto y un ingreso", async () => {
  const handlers = {
    onOrder: jest.fn(),
    onCounterSale: jest.fn(),
    onProduction: jest.fn(),
    onExpense: jest.fn(),
    onIncome: jest.fn(),
  };
  await renderWithProviders(<NewMenu visible onClose={jest.fn()} {...handlers} />);
  for (const title of ["Un pedido", "Una venta de mostrador", "La producción", "Un gasto"])
    expect(screen.getByText(title)).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Un ingreso"));
  expect(handlers.onIncome).toHaveBeenCalled();
  expect(screen.getByText("Plata que entra sin un pedido")).toBeOnTheScreen();
});
