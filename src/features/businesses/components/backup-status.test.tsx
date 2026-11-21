import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { BackupStatus } from "./backup-status";

// Viernes 20 de noviembre de 2026, 10:00 en Lima
const NOW = new Date("2026-11-20T15:00:00.000Z");
const mockStatus = jest.fn();
jest.mock("../api/backup", () => ({ getBackupStatus: () => mockStatus() }));
beforeEach(() => jest.useFakeTimers({ now: NOW, advanceTimers: true }));
afterEach(() => jest.useRealTimers());

test("la copia de las 03:00 de hoy (08:00 UTC): sus datos están respaldados", async () => {
  mockStatus.mockResolvedValue({ lastBackupAt: new Date("2026-11-20T08:00:00.000Z"), late: false });
  await renderWithProviders(<BackupStatus />);
  expect(await screen.findByText("Tus datos están respaldados.")).toBeOnTheScreen();
  expect(screen.getByText("Última copia de seguridad: hoy, 03:00")).toBeOnTheScreen();
});

test("la de anoche se lee «ayer»", async () => {
  mockStatus.mockResolvedValue({ lastBackupAt: new Date("2026-11-19T08:00:00.000Z"), late: false });
  await renderWithProviders(<BackupStatus />);
  expect(await screen.findByText("Última copia de seguridad: ayer, 03:00")).toBeOnTheScreen();
});

test("atrasada, lo dice y que el equipo ya está avisado", async () => {
  mockStatus.mockResolvedValue({ lastBackupAt: new Date("2026-11-18T08:00:00.000Z"), late: true });
  await renderWithProviders(<BackupStatus />);
  expect(await screen.findByText("La copia de seguridad está atrasada.")).toBeOnTheScreen();
  expect(screen.getByText("El equipo ya está avisado.")).toBeOnTheScreen();
});

test("sin ninguna copia todavía no dice nada", async () => {
  mockStatus.mockResolvedValue({ lastBackupAt: null, late: true });
  await renderWithProviders(<BackupStatus />);
  await jest.advanceTimersByTimeAsync(50);
  expect(mockStatus).toHaveBeenCalled();
  expect(screen.queryByText(/copia de seguridad/)).toBeNull();
});
