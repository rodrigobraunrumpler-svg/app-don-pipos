import { onlineManager } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react-native";

import { businessDate } from "@/lib/dates";
import { renderWithProviders } from "@/test/render";

import { customRange, periodRange, type Period } from "../rules/period";
import type { ReportSummary } from "../schema/report";
import { ReportsScreen } from "./reports-screen";

const mockSummary = jest.fn();
jest.mock("../api/reports", () => ({ getReportSummary: (range: unknown) => mockSummary(range) }));

const today = businessDate(new Date());
const week = periodRange("week", new Date());
const month = periodRange("month", new Date());
const range = ({ from, to, previousFrom }: Period) => ({ from, to, previousFrom });
// Un lunes que ya pasó y hoy: en la semana, las barras van por día
const MONDAY = "2026-11-16";
const SUMMARY: ReportSummary = {
  incomeCents: 348600,
  expensesCents: 10600,
  profitCents: 338000,
  previous: { incomeCents: 311200, expensesCents: 20000, profitCents: 291200 },
  bars: [
    { from: MONDAY, to: MONDAY, incomeCents: 118000, expensesCents: 41000 },
    { from: today, to: today, incomeCents: 230600, expensesCents: 0 },
  ],
  byMethod: { cash: 2400, yape: 0, plin: 0, transfer: 700 },
};
const handlers = () => ({ onBack: jest.fn(), onRanking: jest.fn() });

beforeEach(() => mockSummary.mockReset().mockResolvedValue(SUMMARY));
afterEach(() => onlineManager.setOnline(true));

test("la semana: del lunes a hoy frente a los mismos días de la semana pasada, con la ganancia, ingresos y gastos", async () => {
  await renderWithProviders(<ReportsScreen {...handlers()} />);
  expect(await screen.findByText("S/\u00a03,380.00")).toBeOnTheScreen();
  expect(mockSummary).toHaveBeenCalledWith(range(week));
  expect(screen.getByText(week.label)).toBeOnTheScreen();
  expect(screen.getByText("+16\u00a0% frente a la semana pasada")).toBeOnTheScreen();
  expect(screen.getByText("+12\u00a0% frente a la semana pasada")).toBeOnTheScreen();
  expect(screen.getByText("−47\u00a0% frente a la semana pasada")).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a03,486.00")).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a0106.00")).toBeOnTheScreen();
  // Por medio de pago
  expect(screen.getByText("Efectivo")).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a024.00")).toBeOnTheScreen();
  expect(screen.getByText("S/\u00a07.00")).toBeOnTheScreen();
});

test("sin datos del periodo anterior, no hay comparación", async () => {
  mockSummary.mockResolvedValue({ ...SUMMARY, previous: { incomeCents: 0, expensesCents: 0, profitCents: 0 } });
  await renderWithProviders(<ReportsScreen {...handlers()} />);
  await screen.findByText("S/\u00a03,380.00");
  expect(screen.queryByText(/frente a/)).toBeNull();
});

test("Mes cambia lo que se pide y el título", async () => {
  await renderWithProviders(<ReportsScreen {...handlers()} />);
  await screen.findByText("S/\u00a03,380.00");
  await fireEvent.press(screen.getByRole("radio", { name: "Mes" }));
  expect(mockSummary).toHaveBeenLastCalledWith(range(month));
  expect(await screen.findByText(month.label)).toBeOnTheScreen();
});

test("tocar una barra cambia su texto", async () => {
  await renderWithProviders(<ReportsScreen {...handlers()} />);
  expect(await screen.findByText("Hoy entró S/\u00a02,306.00 y salió S/\u00a00.00.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: /^El lunes entró/ }));
  expect(screen.getByText("El lunes entró S/\u00a01,180.00 y salió S/\u00a0410.00.")).toBeOnTheScreen();
});

test("las fechas escritas piden ese rango; mal escritas, dice cómo", async () => {
  await renderWithProviders(<ReportsScreen {...handlers()} />);
  await screen.findByText("S/\u00a03,380.00");
  await fireEvent.press(screen.getByRole("radio", { name: "Elegir fechas" }));
  await fireEvent.changeText(screen.getByLabelText("Desde"), "1/11");
  await fireEvent.press(screen.getByRole("button", { name: "Ver" }));
  expect(screen.getByText("Escribe las dos fechas como día/mes, por ejemplo 1/11.")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText("Hasta"), "15/11");
  await fireEvent.press(screen.getByRole("button", { name: "Ver" }));
  const custom = customRange("1/11", "15/11", today) as Period;
  expect(mockSummary).toHaveBeenLastCalledWith(range(custom));
  expect(await screen.findByText(custom.label)).toBeOnTheScreen();
});

test("«Ver alfajores» lleva el periodo elegido", async () => {
  const on = handlers();
  await renderWithProviders(<ReportsScreen {...on} />);
  await screen.findByText("S/\u00a03,380.00");
  await fireEvent.press(screen.getByRole("button", { name: "Ver alfajores" }));
  expect(on.onRanking).toHaveBeenCalledWith({ from: week.from, to: week.to, label: week.label });
});

const NOTHING: ReportSummary = {
  ...SUMMARY,
  incomeCents: 0,
  expensesCents: 0,
  profitCents: 0,
  bars: [{ from: today, to: today, incomeCents: 0, expensesCents: 0 }],
  byMethod: { cash: 0, yape: 0, plin: 0, transfer: 0 },
};

test("un lunes temprano, sin nada todavía, se ve en cero frente a la semana pasada, no «Todavía no hay datos»", async () => {
  mockSummary.mockResolvedValue(NOTHING);
  await renderWithProviders(<ReportsScreen {...handlers()} />);
  expect(await screen.findAllByText("−100\u00a0% frente a la semana pasada")).toHaveLength(3);
  expect(screen.queryByText("Todavía no hay datos")).toBeNull();
});

test("sin pedidos ni gastos en el periodo ni en el anterior, lo dice; sin señal, desde cuándo son los números", async () => {
  mockSummary.mockResolvedValue({ ...NOTHING, previous: { incomeCents: 0, expensesCents: 0, profitCents: 0 } });
  await renderWithProviders(<ReportsScreen {...handlers()} />);
  expect(await screen.findByText("Todavía no hay datos")).toBeOnTheScreen();
  onlineManager.setOnline(false);
  expect(await screen.findByText(/^Sin conexión\. Ves los números cargados a las \d\d:\d\d\.$/)).toBeOnTheScreen();
});
