import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";
import { summaryOf, TEST_ORDER } from "@/test/orders";

import { CustomerOrders } from "./customer-orders";

const mockList = jest.fn();
jest.mock("../api/orders", () => ({ listCustomerOrders: (input: unknown) => mockList(input) }));

test("sus pedidos, del más nuevo al más viejo, y tocar uno lo abre", async () => {
  mockList.mockResolvedValue({
    items: [summaryOf(TEST_ORDER)],
    meta: { limit: 20, total: 1, hasMore: false, nextCursor: null },
  });
  const onOpen = jest.fn();
  await renderWithProviders(<CustomerOrders customerId="c1" onOpen={onOpen} />);
  expect(screen.getByRole("header", { name: "Sus pedidos" })).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole("button", { name: /^#0042/ }));
  expect(onOpen).toHaveBeenCalledWith(TEST_ORDER.id);
  expect(mockList).toHaveBeenCalledWith({ customerId: "c1", cursor: null });
});

test("sin pedidos, lo dice", async () => {
  mockList.mockResolvedValue({ items: [], meta: { limit: 20, total: 0, hasMore: false, nextCursor: null } });
  await renderWithProviders(<CustomerOrders customerId="c1" onOpen={jest.fn()} />);
  expect(await screen.findByText("Todavía no tiene pedidos.")).toBeOnTheScreen();
});
