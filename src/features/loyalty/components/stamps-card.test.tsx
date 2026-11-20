import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { StampsCard } from "./stamps-card";

const rule = (goal: number, stampUnit: "order" | "item" = "order") => ({
  isActive: true,
  stampUnit,
  goal,
  rewardKind: "free_item" as const,
  rewardAmountCents: null,
  rewardText: null,
});

test("una casilla por sello, cuántos lleva y lo que le falta", async () => {
  await renderWithProviders(<StampsCard rule={rule(10)} stamps={6} />);
  expect(screen.getByText("Tarjeta de sellos")).toBeOnTheScreen();
  expect(screen.getByText("6 de 10")).toBeOnTheScreen();
  expect(screen.getAllByTestId("stamp")).toHaveLength(10);
  expect(screen.getAllByTestId("stamp-filled")).toHaveLength(6);
  expect(screen.getByText("Le faltan 4 compras para su premio: 1 alfajor gratis.")).toBeOnTheScreen();
});

test("con muchos sellos (por alfajor), una barra en vez de casillas; con más de la meta, la meta", async () => {
  await renderWithProviders(<StampsCard rule={rule(60, "item")} stamps={75} />);
  expect(screen.getByText("60 de 60")).toBeOnTheScreen();
  expect(screen.queryAllByTestId("stamp")).toHaveLength(0);
  expect(screen.getByRole("progressbar", { name: "60 de 60 sellos" })).toBeOnTheScreen();
  expect(screen.getByText("Premio listo: se aplica como descuento en su próximo pedido.")).toBeOnTheScreen();
});
