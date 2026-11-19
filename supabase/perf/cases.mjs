// Lo que el medidor corre. Cada caso: con qué usuario, qué consulta y qué tablas no puede leer enteras.
// `maxMs` vale 50 si no se pone. Cada fase suma aquí sus funciones principales.

// El dueño del negocio 2,500 de los 5,000 de supabase/perf/seed.sql
const OWNER = "00000000-0000-4000-9000-0000000009c4";
// Su primer alfajor (negocio 2,500, producto 1: 25,001 = 0x61a9), con 3 años de movimientos
const PRODUCT = "00000000-0000-4000-b000-0000000061a9";
const FIVE_PRODUCTS = JSON.stringify(
  [1, 2, 3, 4, 5].map((k) => ({
    productId: `00000000-0000-4000-b000-${(2500 * 10 + k).toString(16).padStart(12, "0")}`,
    quantity: 10,
  })),
);
const STOCK_TABLES = ["products", "stock_levels", "stock_movements"];

export const cases = [
  { name: "get_business", as: OWNER, sql: "select public.get_business()", tables: ["businesses", "business_settings"] },
  {
    name: "leer businesses con las reglas de acceso",
    as: OWNER,
    sql: "select * from public.businesses",
    tables: ["businesses"],
  },
  {
    name: "leer business_settings con las reglas de acceso",
    as: OWNER,
    sql: "select * from public.business_settings",
    tables: ["businesses", "business_settings"],
  },
  {
    name: "update_settings",
    as: OWNER,
    sql: `select public.update_settings(1, '{"deliveryFeeCents": 500}')`,
    tables: ["businesses", "business_settings"],
  },
  // Fase 3: productos y stock
  { name: "list_products", as: OWNER, sql: "select public.list_products()", tables: ["businesses", "products"] },
  { name: "stock_overview", as: OWNER, sql: "select public.stock_overview()", tables: ["businesses", ...STOCK_TABLES] },
  {
    name: "list_product_movements, primera página",
    as: OWNER,
    sql: `select public.list_product_movements('${PRODUCT}')`,
    tables: ["businesses", "stock_movements"],
  },
  {
    name: "list_product_movements, la página siguiente con su cursor",
    as: OWNER,
    sql: `select public.list_product_movements('${PRODUCT}', 20, public.list_product_movements('${PRODUCT}') -> 'meta' ->> 'nextCursor')`,
    tables: ["businesses", "stock_movements"],
  },
  {
    name: "register_production de 5 alfajores",
    as: OWNER,
    sql: `select public.register_production(gen_random_uuid(), '${FIVE_PRODUCTS}')`,
    tables: ["businesses", ...STOCK_TABLES],
  },
  {
    name: "leer products con las reglas de acceso",
    as: OWNER,
    sql: "select * from public.products",
    tables: ["businesses", "products"],
  },
  {
    name: "leer stock_levels con las reglas de acceso",
    as: OWNER,
    sql: "select * from public.stock_levels",
    tables: ["businesses", "stock_levels"],
  },
  {
    name: "leer los últimos movimientos de un alfajor con las reglas de acceso",
    as: OWNER,
    sql: `select * from public.stock_movements where product_id = '${PRODUCT}' order by happened_at desc, id desc limit 20`,
    tables: ["businesses", "stock_movements"],
  },
];

// Un caso hecho para fallar: busca dentro del nombre, así que lee la tabla entera. `pnpm db:perf --self-test`
export const selfTest = {
  name: "caso hecho para fallar",
  as: null,
  sql: "select count(*) from public.businesses where name like '%7%'",
  tables: ["businesses"],
};
