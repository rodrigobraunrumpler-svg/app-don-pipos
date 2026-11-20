import { onlineManager } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render";

import { periodRange } from "../rules/period";
import { ExportSheet } from "./export-sheet";

const mockRows = jest.fn();
const mockShare = jest.fn();
jest.mock("../api/reports", () => ({ getExportRows: (from: string, to: string) => mockRows(from, to) }));
jest.mock("@/lib/share-file", () => ({ shareCsv: (name: string, text: string) => mockShare(name, text) }));

const month = periodRange("month", new Date());
const ROW = {
  kind: "expense",
  at: "2026-11-10T17:00:00.000Z",
  orderNumber: null,
  customerName: null,
  detail: "Insumos",
  method: "yape",
  amountCents: 1200,
  status: null,
};

beforeEach(() => {
  mockRows.mockReset().mockResolvedValue([ROW]);
  mockShare.mockReset().mockResolvedValue(undefined);
});
afterEach(() => onlineManager.setOnline(true));

test("exportar el mes pide sus filas, arma el archivo y lo comparte con su nombre", async () => {
  const onClose = jest.fn();
  await renderWithProviders(<ExportSheet onClose={onClose} />);
  expect(screen.getByRole("radio", { name: "Esta semana" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "El mes pasado" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("radio", { name: "Este mes" }));
  await fireEvent.press(screen.getByRole("button", { name: "Compartir archivo" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(mockRows).toHaveBeenCalledWith(month.from, month.to);
  expect(mockShare).toHaveBeenCalledWith(
    `don-pipos-${month.from}-${month.to}.csv`,
    "﻿Tipo;Fecha;Hora;Pedido;Cliente;Detalle;Medio;Monto;Estado\r\nGasto;10/11/2026;12:00;;;Insumos;Yape;12.00;\r\n",
  );
});

test("sin nada en el periodo, lo dice y no comparte", async () => {
  mockRows.mockResolvedValue([]);
  const onClose = jest.fn();
  await renderWithProviders(<ExportSheet onClose={onClose} />);
  await fireEvent.press(screen.getByRole("button", { name: "Compartir archivo" }));
  expect(await screen.findByText("No hay pedidos, pagos, gastos ni ingresos en ese periodo.")).toBeOnTheScreen();
  expect(mockShare).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test("desde Reportes llegan sus fechas, ya elegidas; sin señal no se puede", async () => {
  const initial = { from: "2026-11-01", to: "2026-11-15", label: "Del 1 nov al 15 nov" };
  await renderWithProviders(<ExportSheet initial={initial} onClose={jest.fn()} />);
  expect(screen.getByRole("radio", { name: "Del 1 nov al 15 nov", checked: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Compartir archivo" }));
  await waitFor(() => expect(mockRows).toHaveBeenCalledWith("2026-11-01", "2026-11-15"));
  onlineManager.setOnline(false);
  await waitFor(() => expect(screen.getByRole("button", { name: "Compartir archivo" })).toBeDisabled());
});

test("si el periodo de Reportes es el mes, no se repite", async () => {
  await renderWithProviders(<ExportSheet initial={month} onClose={jest.fn()} />);
  expect(screen.getAllByRole("radio")).toHaveLength(3);
  expect(screen.getByRole("radio", { name: "Este mes", checked: true })).toBeOnTheScreen();
});
