import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AppError } from "@/lib/errors";
import { createTestQueryClient } from "@/test/render";

import { customersKeys } from "../queries/keys";
import type { Customer } from "../schema/customer";
import { useAnonymizeCustomer, useUpdateCustomer } from "./use-customer-changes";

const mockUpdate = jest.fn();
const mockErase = jest.fn();
jest.mock("../api/customers", () => ({
  updateCustomer: (input: unknown) => mockUpdate(input),
  anonymizeCustomer: (id: string) => mockErase(id),
}));

const LUCIA: Customer = {
  id: "c1",
  name: "Lucía R. (DEMO)",
  phone: "+51900000128",
  ordersCount: 9,
  spentCents: 38600,
  lastOrderAt: null,
  acceptsPromotions: true,
  address: null,
  note: null,
  stamps: 7,
  favorite: null,
  anonymizedAt: null,
  version: 4,
};
const EDIT = { id: "c1", expectedVersion: 4, name: LUCIA.name, address: "", note: "", acceptsPromotions: false };

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(customersKeys.detail("c1"), LUCIA);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}
const detail = (client: QueryClient) => client.getQueryData<Customer>(customersKeys.detail("c1"));

test("cambiar sus datos se ve al instante, y queda lo que devuelve la base", async () => {
  let release: (customer: Customer) => void = () => undefined;
  mockUpdate.mockReturnValue(new Promise<Customer>((resolve) => (release = resolve)));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useUpdateCustomer(), { wrapper });
  let saving: Promise<Customer> = Promise.resolve(LUCIA);
  await act(async () => {
    saving = result.current.mutateAsync(EDIT);
  });
  await waitFor(() => expect(detail(client)?.acceptsPromotions).toBe(false));
  await act(async () => {
    release({ ...LUCIA, acceptsPromotions: false, version: 5 });
    await saving;
  });
  expect(detail(client)?.version).toBe(5);
});

test("si no se guarda, vuelve a como estaba", async () => {
  mockUpdate.mockRejectedValue(new AppError("conflict"));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useUpdateCustomer(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync(EDIT).catch(() => undefined);
  });
  expect(detail(client)?.acceptsPromotions).toBe(true);
});

test("borrar sus datos deja la ficha borrada y saca del celular lo guardado con su teléfono y sus listas", async () => {
  const erased = {
    ...LUCIA,
    name: "Cliente eliminado",
    phone: null,
    anonymizedAt: "2026-11-20T15:00:00.000Z",
    version: 5,
  };
  mockErase.mockResolvedValue(erased);
  const { client, wrapper } = setup();
  client.setQueryData(customersKeys.byPhone("+51900000128"), { id: "c1", name: LUCIA.name });
  client.setQueryData(customersKeys.list("all", ""), { pages: [], pageParams: [] });
  client.setQueryData(["orders", "detail", "o1"], { customerName: LUCIA.name });
  const { result } = await renderHook(() => useAnonymizeCustomer([["orders"]]), { wrapper });
  await act(async () => {
    await result.current.mutateAsync("c1");
  });
  expect(detail(client)?.anonymizedAt).toBe("2026-11-20T15:00:00.000Z");
  expect(client.getQueryData(customersKeys.byPhone("+51900000128"))).toBeUndefined();
  expect(client.getQueryData(customersKeys.list("all", ""))).toBeUndefined();
  expect(client.getQueryData(["orders", "detail", "o1"])).toBeUndefined();
});
