import { reorderProducts, saveProduct, setProductPhoto, uploadProductPhoto } from "./products";

const mockRpc = jest.fn();
const mockUpload = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: () => ({ rpc: mockRpc, storage: { from: () => ({ upload: mockUpload }) } }),
}));

const SAVED = {
  id: "p1",
  name: "Coqueta",
  priceCents: 1200,
  costCents: null,
  minStock: 6,
  showOnWeb: true,
  isActive: true,
  sortOrder: 1,
  imageUrl: null,
  linkedToWeb: false,
  description: "Relleno de frutos rojos y bañado en chocolate",
  allergens: ["gluten", "lacteos"],
  hasPhoto: false,
  webSlug: null,
  isNew: false,
  webState: "incomplete",
  version: 1,
};

beforeEach(() => {
  mockRpc.mockReset();
  mockUpload.mockReset();
});

test("guardar manda la descripción y los alérgenos, y el alfajor vuelve con su estado en la web", async () => {
  mockRpc.mockResolvedValue({ data: SAVED, error: null });
  await expect(
    saveProduct({
      id: null,
      expectedVersion: null,
      name: "Coqueta",
      priceCents: 1200,
      costCents: null,
      minStock: 6,
      showOnWeb: true,
      description: "Relleno de frutos rojos y bañado en chocolate",
      allergens: ["gluten", "lacteos"],
    }),
  ).resolves.toEqual(SAVED);
  expect(mockRpc).toHaveBeenLastCalledWith("save_product", {
    p_id: null,
    p_expected_version: null,
    p_name: "Coqueta",
    p_price_cents: 1200,
    p_cost_cents: null,
    p_min_stock: 6,
    p_show_on_web: true,
    p_description: "Relleno de frutos rojos y bañado en chocolate",
    p_allergens: ["gluten", "lacteos"],
  });
});

test("un alfajor de antes, sin los campos de la web, llega con sus valores por defecto", async () => {
  const { description, allergens, hasPhoto, webSlug, isNew, webState, ...old } = SAVED;
  mockRpc.mockResolvedValue({ data: old, error: null });
  const product = await saveProduct({ ...SAVED, id: "p1", expectedVersion: 1 });
  expect(product).toMatchObject({
    description: null,
    allergens: [],
    hasPhoto: false,
    webSlug: null,
    isNew: false,
    webState: "none",
  });
  expect([description, allergens, hasPhoto, webSlug, isNew, webState]).toBeDefined();
});

test("la foto se sube a la carpeta del alfajor y después se anota", async () => {
  mockUpload.mockResolvedValue({ error: null });
  await uploadProductPhoto({ path: "b1/p1/f1.jpg", base64: "QUJD" });
  expect(mockUpload).toHaveBeenCalledWith("b1/p1/f1.jpg", Uint8Array.from([65, 66, 67]), {
    contentType: "image/jpeg",
    upsert: false,
  });
  mockRpc.mockResolvedValue({ data: { ...SAVED, hasPhoto: true, version: 2 }, error: null });
  await expect(setProductPhoto("p1", "b1/p1/f1.jpg")).resolves.toMatchObject({ hasPhoto: true, version: 2 });
  expect(mockRpc).toHaveBeenLastCalledWith("set_product_photo", { p_product_id: "p1", p_path: "b1/p1/f1.jpg" });
});

test("ordenar manda los alfajores en el orden nuevo y vuelve la lista como queda", async () => {
  mockRpc.mockResolvedValue({ data: [SAVED], error: null });
  await expect(reorderProducts(["p2", "p1"])).resolves.toEqual([SAVED]);
  expect(mockRpc).toHaveBeenLastCalledWith("reorder_products", { p_ids: ["p2", "p1"] });
});
