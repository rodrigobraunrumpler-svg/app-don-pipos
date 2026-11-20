import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import type { ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { TEST_BUSINESS } from "@/test/business";
import { createTestQueryClient } from "@/test/render";

import { useReminderSync } from "./use-reminder-sync";

// Miércoles 18 de noviembre de 2026, 11:40 en Lima
const NOW = new Date("2026-11-18T16:40:00.000Z");
const page = <T,>(items: T[]) => ({
  items,
  meta: { limit: 20, total: items.length, hasMore: false, nextCursor: null },
});
let mockBusiness = TEST_BUSINESS;
// Lo que hay: un pedido para mañana, un saldo de ayer y Morenita baja. Cada prueba lo cambia si necesita
let mockEmpty = false;
let mockOnHand = 4;
jest.mock("@/features/businesses/api/business", () => ({ getBusiness: async () => mockBusiness }));
jest.mock("@/features/orders/api/orders", () => ({
  listUpcomingOrders: async () =>
    mockEmpty
      ? []
      : [
          {
            id: "o1",
            number: 44,
            status: "new",
            fulfillment: "pickup",
            customerName: "Patricia V. (DEMO)",
            itemsSummary: "12 Coquetas",
            totalCents: 14400,
            paidCents: 0,
            promisedAt: "2026-11-19T15:00:00.000Z",
            dueDate: "2026-11-19",
          },
        ],
  listReceivables: async () => ({
    ...page(
      mockEmpty
        ? []
        : [
            {
              id: "o9",
              number: 40,
              customerName: "Jorge P. (DEMO)",
              customerPhone: "+51900000301",
              fulfillment: "pickup",
              status: "delivered",
              totalCents: 2400,
              paidCents: 0,
              dueDate: "2026-11-17",
              scheduledFor: null,
              remind: true,
            },
          ],
    ),
    meta: { limit: 20, total: 1, hasMore: false, nextCursor: null, totalDueCents: 2400 },
  }),
}));
jest.mock("@/features/stock/api/stock", () => ({
  getStockOverview: async () => [
    {
      productId: "p1",
      name: "Morenita",
      imageUrl: null,
      linkedToWeb: false,
      minStock: 6,
      onHand: mockOnHand,
      reserved: 0,
      physical: mockOnHand,
      coverageDays: 1,
      state: mockEmpty ? "ok" : "low",
    },
  ],
}));

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancelAll = jest.mocked(Notifications.cancelAllScheduledNotificationsAsync);
const permissions = jest.mocked(Notifications.getPermissionsAsync);
const request = jest.mocked(Notifications.requestPermissionsAsync);
const GRANTED = { status: "granted", granted: true, canAskAgain: true } as never;
// El permiso como lo tiene el celular en cada momento de la prueba
let mockPermission = "granted";
let appStateHandlers: ((state: AppStateStatus) => void)[] = [];

beforeEach(async () => {
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
  mockBusiness = TEST_BUSINESS;
  mockEmpty = false;
  mockOnHand = 4;
  mockPermission = "granted";
  permissions.mockImplementation(
    async () => ({ status: mockPermission, granted: mockPermission === "granted", canAskAgain: true }) as never,
  );
  request.mockReset();
  request.mockResolvedValue(GRANTED);
  schedule.mockClear();
  cancelAll.mockClear();
  appStateHandlers = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
    appStateHandlers.push(handler as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  await AsyncStorage.clear();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  permissions.mockImplementation(async () => GRANTED);
});

async function sync(): Promise<QueryClient> {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  await renderHook(() => useReminderSync(), { wrapper });
  return client;
}

const scheduled = () => schedule.mock.calls.map(([request]) => request);

test("el pedido de mañana, el alfajor que se acaba y el saldo de ayer quedan en el celular, con su pantalla", async () => {
  await sync();
  await waitFor(() => expect(schedule).toHaveBeenCalledTimes(3));
  expect(scheduled()).toEqual([
    {
      identifier: "order:o1",
      content: {
        title: "Mañana a las 10:00: pedido de Patricia V. (DEMO)",
        body: "12 Coquetas para recoger. Falta cobrar S/ 144.00.",
        data: { url: "/orders/o1" },
      },
      trigger: { type: "date", date: new Date("2026-11-18T23:00:00.000Z"), channelId: "reminders" },
    },
    {
      identifier: "balances",
      content: {
        title: "Jorge P. (DEMO) te debe S/ 24.00",
        body: "Desde hace 2 días. Toca para enviarle un recordatorio.",
        data: { url: "/orders/receivables" },
      },
      trigger: { type: "date", date: new Date("2026-11-19T14:00:00.000Z"), channelId: "reminders" },
    },
    {
      identifier: "stock:p1",
      content: {
        title: "Morenita se está acabando",
        body: "Quedan 4. Toca para ver cuánto conviene producir.",
        data: { url: "/stock/production" },
      },
      trigger: { channelId: "reminders" },
    },
  ]);
});

test("volver a traer lo mismo no programa otra vez, y el alfajor no avisa dos veces el mismo día", async () => {
  const client = await sync();
  await waitFor(() => expect(schedule).toHaveBeenCalledTimes(3));
  await act(() => client.refetchQueries());
  await act(() => jest.advanceTimersByTimeAsync(50));
  expect(schedule).toHaveBeenCalledTimes(3);
  expect(JSON.parse((await AsyncStorage.getItem("donpipos.stockNotified")) ?? "{}")).toEqual({
    day: "2026-11-18",
    ids: ["stock:p1"],
  });
});

test("al día siguiente el alfajor puede volver a avisar", async () => {
  await AsyncStorage.setItem("donpipos.stockNotified", JSON.stringify({ day: "2026-11-17", ids: ["stock:p1"] }));
  await sync();
  await waitFor(() => expect(schedule).toHaveBeenCalledTimes(3));
  await AsyncStorage.setItem("donpipos.stockNotified", JSON.stringify({ day: "2026-11-18", ids: ["stock:p1"] }));
  schedule.mockClear();
  await sync();
  await waitFor(() => expect(schedule).toHaveBeenCalledTimes(2));
  expect(scheduled().map((request) => request.identifier)).toEqual(["order:o1", "balances"]);
});

test("apagar «Saldos pendientes» los cancela y no los vuelve a programar", async () => {
  mockBusiness = {
    ...TEST_BUSINESS,
    settings: { ...TEST_BUSINESS.settings, reminders: { scheduled: true, stock: false, balances: false } },
  };
  await sync();
  await waitFor(() => expect(schedule).toHaveBeenCalledTimes(1));
  expect(cancelAll).toHaveBeenCalled();
  expect(scheduled()[0]?.identifier).toBe("order:o1");
});

test("sin permiso del celular no programa nada", async () => {
  mockPermission = "denied";
  await sync();
  await waitFor(() => expect(cancelAll).toHaveBeenCalled());
  await act(() => jest.advanceTimersByTimeAsync(50));
  expect(schedule).not.toHaveBeenCalled();
});

test("si llega otra recarga con el diálogo de permiso abierto, al aceptar igual quedan los avisos", async () => {
  mockPermission = "undetermined";
  let allow: () => void = () => undefined;
  request.mockImplementation(
    () =>
      new Promise((resolve) => {
        allow = () => {
          mockPermission = "granted";
          resolve(GRANTED);
        };
      }),
  );
  const client = await sync();
  await act(() => jest.advanceTimersByTimeAsync(100));
  expect(request).toHaveBeenCalledTimes(1);
  mockOnHand = 3;
  await act(() => client.refetchQueries());
  await act(() => jest.advanceTimersByTimeAsync(100));
  await act(async () => allow());
  await act(() => jest.advanceTimersByTimeAsync(100));
  expect(request).toHaveBeenCalledTimes(1);
  expect(scheduled().map((call) => call.identifier)).toEqual(["order:o1", "balances", "stock:p1"]);
});

test("sin nada que avisar no pide el permiso", async () => {
  mockEmpty = true;
  mockPermission = "undetermined";
  await sync();
  await act(() => jest.advanceTimersByTimeAsync(100));
  expect(request).not.toHaveBeenCalled();
  expect(schedule).not.toHaveBeenCalled();
});

test("si después da el permiso en los ajustes del celular, al volver a la app quedan los avisos", async () => {
  mockPermission = "denied";
  await sync();
  await act(() => jest.advanceTimersByTimeAsync(100));
  expect(schedule).not.toHaveBeenCalled();
  mockPermission = "granted";
  await act(async () => appStateHandlers.forEach((handler) => handler("active")));
  await waitFor(() => expect(schedule).toHaveBeenCalledTimes(3));
});
