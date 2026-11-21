import { act, fireEvent, screen } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";

import type { Business } from "@/features/businesses";
import { TEST_BUSINESS } from "@/test/business";
import { renderWithProviders } from "@/test/render";

import { RemindersRow } from "./reminders-row";
import { RemindersSheet } from "./reminders-sheet";

const mockUpdate = jest.fn();
let mockBusiness: Business = TEST_BUSINESS;
jest.mock("@/features/businesses/api/business", () => ({
  getBusiness: async () => mockBusiness,
  updateSettings: (version: number, patch: unknown) => mockUpdate(version, patch),
}));

const permissions = jest.mocked(Notifications.getPermissionsAsync);

beforeEach(() => {
  mockUpdate.mockReset();
  mockBusiness = TEST_BUSINESS;
});

test("tres interruptores con su explicación; apagar uno manda los tres", async () => {
  mockUpdate.mockResolvedValue({ ...TEST_BUSINESS.settings, version: 2 });
  await renderWithProviders(<RemindersSheet onClose={jest.fn()} />);
  expect(await screen.findByText("Avisos del propio celular, aunque la app esté cerrada.")).toBeOnTheScreen();
  expect(screen.getByText("El día antes, a las 18:00")).toBeOnTheScreen();
  expect(screen.getByText("Si alguien debe desde hace un día")).toBeOnTheScreen();
  await fireEvent(await screen.findByRole("switch", { name: "Pedidos para otro día" }), "valueChange", false);
  expect(mockUpdate).toHaveBeenCalledWith(1, { reminders: { scheduled: false, stock: true, balances: true } });
});

test("si el celular no dio permiso, lo dice y abre sus ajustes", async () => {
  permissions.mockResolvedValue({ status: "denied", granted: false, canAskAgain: false } as never);
  const open = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
  await renderWithProviders(<RemindersSheet onClose={jest.fn()} />);
  expect(await screen.findByText("El celular no deja que Don Pipos te mande avisos.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Abrir ajustes del celular" }));
  expect(open).toHaveBeenCalled();
  open.mockRestore();
  permissions.mockResolvedValue({ status: "granted", granted: true, canAskAgain: true } as never);
});

test("si nunca se pidió, «Permitir avisos» lo pide", async () => {
  permissions.mockResolvedValue({ status: "undetermined", granted: false, canAskAgain: true } as never);
  await renderWithProviders(<RemindersSheet onClose={jest.fn()} />);
  await fireEvent.press(await screen.findByRole("button", { name: "Permitir avisos" }));
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  permissions.mockResolvedValue({ status: "granted", granted: true, canAskAgain: true } as never);
  await act(async () => undefined);
});

test("la fila de Ajustes dice cuántos están encendidos", async () => {
  mockBusiness = {
    ...TEST_BUSINESS,
    settings: { ...TEST_BUSINESS.settings, reminders: { scheduled: false, stock: true, balances: true } },
  };
  await renderWithProviders(<RemindersRow />);
  expect(await screen.findByRole("button", { name: "Recordatorios, 2 activos" })).toBeOnTheScreen();
});
