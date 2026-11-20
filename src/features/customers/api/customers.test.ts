import { anonymizeCustomer, findCustomerByPhone, getCustomer, searchCustomers, updateCustomer } from "./customers";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({ supabase: () => ({ rpc: mockRpc }) }));

const ROW = {
  id: "c1",
  name: "Ana Q. (DEMO)",
  phone: "+51900000501",
  ordersCount: 2,
  spentCents: 3600,
  lastOrderAt: "2026-11-18T15:00:00.000Z",
  acceptsPromotions: true,
};
const CUSTOMER = {
  ...ROW,
  address: null,
  note: null,
  stamps: 4,
  favorite: { productId: "p1", name: "Coqueta" },
  anonymizedAt: null,
  version: 3,
};

beforeEach(() => mockRpc.mockReset());

test("buscar manda el texto, el filtro y el cursor; sin texto, null", async () => {
  const page = { items: [ROW], meta: { limit: 20, total: 1, hasMore: false, nextCursor: null } };
  mockRpc.mockResolvedValue({ data: page, error: null });
  await expect(searchCustomers({ filter: "lapsed", search: "ana", cursor: "x~c0" })).resolves.toEqual(page);
  expect(mockRpc).toHaveBeenLastCalledWith("search_customers", {
    p_q: "ana",
    p_filter: "lapsed",
    p_limit: 20,
    p_cursor: "x~c0",
  });
  await searchCustomers({ filter: "all", search: "", cursor: null });
  expect(mockRpc).toHaveBeenLastCalledWith("search_customers", {
    p_q: null,
    p_filter: "all",
    p_limit: 20,
    p_cursor: null,
  });
});

test("la ficha, corregirla y borrar sus datos llegan revisadas con su esquema", async () => {
  mockRpc.mockResolvedValue({ data: CUSTOMER, error: null });
  await expect(getCustomer("c1")).resolves.toEqual(CUSTOMER);
  expect(mockRpc).toHaveBeenLastCalledWith("get_customer", { p_id: "c1" });
  await updateCustomer({
    id: "c1",
    expectedVersion: 3,
    name: "Ana (DEMO)",
    address: "",
    note: "Sin azúcar",
    acceptsPromotions: false,
  });
  expect(mockRpc).toHaveBeenLastCalledWith("update_customer", {
    p_id: "c1",
    p_expected_version: 3,
    p_name: "Ana (DEMO)",
    p_address: "",
    p_note: "Sin azúcar",
    p_accepts_promotions: false,
  });
  const erased = { ...CUSTOMER, name: "Cliente eliminado", phone: null, anonymizedAt: "2026-11-18T15:00:00.000Z" };
  mockRpc.mockResolvedValue({ data: erased, error: null });
  await expect(anonymizeCustomer("c1")).resolves.toMatchObject({
    phone: null,
    anonymizedAt: "2026-11-18T15:00:00.000Z",
  });
  expect(mockRpc).toHaveBeenLastCalledWith("anonymize_customer", { p_id: "c1" });
  mockRpc.mockResolvedValue({ data: { ...CUSTOMER, stamps: null }, error: null });
  await expect(getCustomer("c1")).rejects.toMatchObject({ kind: "unexpected" });
});

test("el cliente de un teléfono trae sus sellos", async () => {
  mockRpc.mockResolvedValue({
    data: { id: "c1", name: "Ana", address: null, ordersCount: 2, lastOrderAt: null, stamps: 9, lastOrder: null },
    error: null,
  });
  await expect(findCustomerByPhone("+51900000501")).resolves.toMatchObject({ stamps: 9 });
});
