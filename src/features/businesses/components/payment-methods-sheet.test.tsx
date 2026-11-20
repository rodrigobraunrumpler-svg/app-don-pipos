import { fireEvent, screen } from "@testing-library/react-native";

import { TEST_BUSINESS } from "@/test/business";
import { renderWithProviders } from "@/test/render";

import type { Business } from "../schema/business";
import { PaymentMethodsSheet } from "./payment-methods-sheet";

const mockUpdate = jest.fn();
let mockBusiness: Business = TEST_BUSINESS;
jest.mock("../api/business", () => ({
  getBusiness: async () => mockBusiness,
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

beforeEach(() => {
  mockUpdate.mockReset();
  mockBusiness = TEST_BUSINESS;
});

test("apagar Plin manda los demás medios, en su orden", async () => {
  mockUpdate.mockResolvedValue({
    ...TEST_BUSINESS.settings,
    activePaymentMethods: ["cash", "yape", "transfer"],
    version: 2,
  });
  await renderWithProviders(<PaymentMethodsSheet onClose={jest.fn()} />);
  expect(await screen.findByText("Los que apagues dejan de aparecer al anotar pedidos y gastos.")).toBeOnTheScreen();
  await fireEvent(await screen.findByRole("switch", { name: "Plin" }), "valueChange", false);
  expect(mockUpdate).toHaveBeenCalledWith(1, { activePaymentMethods: ["cash", "yape", "transfer"] });
});

test("con un solo medio encendido, ese no se puede apagar", async () => {
  mockBusiness = { ...TEST_BUSINESS, settings: { ...TEST_BUSINESS.settings, activePaymentMethods: ["cash"] } };
  await renderWithProviders(<PaymentMethodsSheet onClose={jest.fn()} />);
  expect(await screen.findByRole("switch", { name: "Efectivo" })).toBeDisabled();
  expect(screen.getByText("Deja al menos uno encendido.")).toBeOnTheScreen();
  expect(screen.getByRole("switch", { name: "Yape" })).not.toBeDisabled();
});
