import { fireEvent, screen } from "@testing-library/react-native";

import { TEST_ORDER, summaryOf } from "@/test/orders";
import { renderWithProviders } from "@/test/render";

import { OrderRow } from "./order-row";

// El jueves 19 de noviembre de 2026, 11:40 en Lima
const NOW = new Date("2026-11-19T16:40:00.000Z");

test("la fila dice quién, qué pidió, cuánto, su estado, lo que falta cobrar y la demora", async () => {
  const onPress = jest.fn();
  const order = {
    ...summaryOf(TEST_ORDER),
    number: 44,
    fulfillment: "pickup" as const,
    status: "preparing" as const,
    customerName: "Miguel A. (DEMO)",
    itemsSummary: "6 Manteaditas",
    promisedAt: "2026-11-19T16:30:00.000Z",
    totalCents: 6600,
    paidCents: 3000,
  };
  await renderWithProviders(<OrderRow order={order} now={NOW} onPress={onPress} />);
  for (const text of ["#0044", "Recoge 11:30", "Miguel A. (DEMO)", "10 min tarde", "6 Manteaditas", "Preparando"])
    expect(screen.getByText(text)).toBeOnTheScreen();
  expect(screen.getByText("S/ 66.00")).toBeOnTheScreen();
  expect(screen.getByText("Falta S/ 36.00")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button"));
  expect(onPress).toHaveBeenCalled();
});

test("una venta de mostrador", async () => {
  const counter = {
    ...summaryOf(TEST_ORDER),
    number: 43,
    fulfillment: "counter" as const,
    status: "delivered" as const,
    customerName: null,
    totalCents: 1200,
    paidCents: 1200,
  };
  await renderWithProviders(<OrderRow order={counter} now={NOW} onPress={jest.fn()} />);
  for (const text of ["Cliente de mostrador", "Mostrador", "Entregado", "Pagado"])
    expect(screen.getByText(text)).toBeOnTheScreen();
});

test("un pedido de ayer que nadie entregó", async () => {
  const overdue = {
    ...summaryOf(TEST_ORDER),
    number: 37,
    dueDate: "2026-11-18",
    status: "on_the_way" as const,
    paidCents: 0,
  };
  await renderWithProviders(<OrderRow order={overdue} now={NOW} onPress={jest.fn()} />);
  for (const text of ["#0037, ayer", "Delivery", "Atrasado", "En camino", "Cobrar S/ 42.00"])
    expect(screen.getByText(text)).toBeOnTheScreen();
});

test("en la fila, «Listo para recoger» se acorta a «Listo» para que todo entre en una línea", async () => {
  const ready = { ...summaryOf(TEST_ORDER), fulfillment: "pickup" as const, status: "ready" as const };
  await renderWithProviders(<OrderRow order={ready} now={NOW} onPress={jest.fn()} />);
  expect(screen.getByText("Listo")).toBeOnTheScreen();
  expect(screen.queryByText("Listo para recoger")).toBeNull();
  expect(screen.getByRole("button", { name: /Listo para recoger/ })).toBeOnTheScreen();
});
