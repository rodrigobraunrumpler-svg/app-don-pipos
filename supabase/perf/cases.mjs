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
// Fase 4a: el mismo negocio con 3 años de pedidos (#1 a #10,970) y 300 clientes. El pedido #5,000 (0x1388)
const ORDER = "00000000-0000-4000-c000-000000001388";
const ORDER_TABLES = ["orders", "order_lines", "payments", "customers", "order_status_events"];
// Fase 7a: un cliente con pedidos (el 150 de los 300: 0x96)
const CUSTOMER = "00000000-0000-4000-d000-000000000096";
const DRAFT = JSON.stringify({
  customer: { phone: "+51955000150", name: "Cliente 150 (DEMO)" },
  channel: "whatsapp",
  fulfillment: "pickup",
  lines: [1, 2].map((k) => ({
    productId: `00000000-0000-4000-b000-${(2500 * 10 + k).toString(16).padStart(12, "0")}`,
    quantity: 2,
  })),
});

// Fase 5: el mismo negocio con 3 años de gastos, ingresos a mano y cierres de caja
const EXPENSE_TABLES = ["expenses", "expense_categories"];
const INCOME_TABLES = ["payments", "manual_incomes"];
const TODAY = "(now() at time zone 'America/Lima')::date";
const MONTH_START = "date_trunc('month', now() at time zone 'America/Lima')::date";
const WEEK_START = "date_trunc('week', now() at time zone 'America/Lima')::date";

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
  {
    name: "stock_overview, con lo apartado",
    as: OWNER,
    sql: "select public.stock_overview()",
    tables: ["businesses", ...STOCK_TABLES, "orders", "order_lines"],
  },
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
  // Fase 4a: pedidos
  ...[
    ["«Hoy»", "'today'"],
    ["«Por entregar»", "'to_deliver'"],
    ["«Todos», primera página", "'all'"],
    [
      "«Todos», la página siguiente con su cursor",
      "'all', null, 20, public.list_orders('all') -> 'meta' ->> 'nextCursor'",
    ],
    ["buscar «#5000»", "'all', '#5000'"],
    ["buscar «cliente 15»", "'all', 'cliente 15'"],
  ].map(([name, args]) => ({
    name: `list_orders, ${name}`,
    as: OWNER,
    sql: `select public.list_orders(${args})`,
    tables: ["businesses", "orders"],
  })),
  { name: "order_counts", as: OWNER, sql: "select public.order_counts()", tables: ["businesses", "orders"] },
  {
    name: "production_suggestion, con 3 años de pedidos",
    as: OWNER,
    sql: "select public.production_suggestion()",
    tables: ["businesses", "orders", "order_lines", ...STOCK_TABLES],
  },
  {
    name: "product_sales_by_weekday",
    as: OWNER,
    sql: `select public.product_sales_by_weekday('${PRODUCT}')`,
    tables: ["businesses", "orders", "order_lines"],
  },
  {
    name: "list_receivables, primera página",
    as: OWNER,
    sql: "select public.list_receivables()",
    tables: ["businesses", "orders", "customers"],
  },
  { name: "get_order", as: OWNER, sql: `select public.get_order('${ORDER}')`, tables: ["businesses", ...ORDER_TABLES] },
  {
    name: "find_customer_by_phone",
    as: OWNER,
    sql: "select public.find_customer_by_phone('+51955000150')",
    tables: ["businesses", ...ORDER_TABLES],
  },
  {
    name: "create_order de 2 alfajores, cliente que ya existe",
    as: OWNER,
    sql: `select public.create_order(gen_random_uuid(), '${DRAFT}')`,
    tables: ["businesses", ...ORDER_TABLES, ...STOCK_TABLES],
  },
  // Fase 5: gastos, ingresos y caja, con 3 años de cada uno
  {
    name: "list_expense_categories",
    as: OWNER,
    sql: "select public.list_expense_categories()",
    tables: ["businesses", "expense_categories"],
  },
  {
    name: "list_expenses, primera página",
    as: OWNER,
    sql: "select public.list_expenses()",
    tables: ["businesses", ...EXPENSE_TABLES],
  },
  {
    name: "list_expenses, la página siguiente con su cursor",
    as: OWNER,
    sql: "select public.list_expenses(null, null, 20, public.list_expenses() -> 'meta' ->> 'nextCursor')",
    tables: ["businesses", ...EXPENSE_TABLES],
  },
  {
    name: "expenses_summary del mes",
    as: OWNER,
    sql: `select public.expenses_summary(${MONTH_START}, ${TODAY})`,
    tables: ["businesses", ...EXPENSE_TABLES],
  },
  {
    name: "income_summary del mes",
    as: OWNER,
    sql: `select public.income_summary(${MONTH_START}, ${TODAY})`,
    tables: ["businesses", ...INCOME_TABLES],
  },
  {
    name: "list_income, primera página",
    as: OWNER,
    sql: "select public.list_income()",
    tables: ["businesses", ...INCOME_TABLES, "orders"],
  },
  {
    name: "list_income, la página siguiente con su cursor",
    as: OWNER,
    sql: "select public.list_income(null, null, 20, public.list_income() -> 'meta' ->> 'nextCursor')",
    tables: ["businesses", ...INCOME_TABLES, "orders"],
  },
  {
    name: "cash_expected de hoy",
    as: OWNER,
    sql: `select public.cash_expected(${TODAY})`,
    tables: ["businesses", ...INCOME_TABLES, ...EXPENSE_TABLES, "cash_counts"],
  },
  {
    name: "latest_cash_count de hoy",
    as: OWNER,
    sql: `select public.latest_cash_count(${TODAY})`,
    tables: ["businesses", "cash_counts"],
  },
  // Fase 6: Inicio y reportes, con los 3 años del negocio medido
  {
    name: "home_summary",
    as: OWNER,
    sql: "select public.home_summary()",
    tables: ["businesses", ...INCOME_TABLES, "orders", "cash_counts"],
  },
  {
    name: "report_summary de la semana",
    as: OWNER,
    sql: `select public.report_summary(${WEEK_START}, ${TODAY})`,
    tables: ["businesses", ...INCOME_TABLES, "expenses"],
  },
  {
    name: "report_summary del mes",
    as: OWNER,
    sql: `select public.report_summary(${MONTH_START}, ${TODAY})`,
    tables: ["businesses", ...INCOME_TABLES, "expenses"],
  },
  {
    name: "report_ranking del mes",
    as: OWNER,
    sql: `select public.report_ranking(${MONTH_START}, ${TODAY})`,
    tables: ["businesses", "orders", "order_lines", "products"],
  },
  {
    name: "export_rows del mes",
    as: OWNER,
    sql: `select public.export_rows(${MONTH_START}, ${TODAY})`,
    tables: ["businesses", "orders", ...INCOME_TABLES, ...EXPENSE_TABLES],
  },
  // Fase 7a: buscar entre decenas de miles de clientes, la ficha y sus pedidos
  ...[
    ["todos", "null, 'all'"],
    ["los que más compran", "null, 'top'"],
    ["no vuelven", "null, 'lapsed'"],
    // El cursor de un cliente del medio (el 20 de los 300), sin otra búsqueda para sacarlo
    [
      "la página siguiente de todos",
      "null, 'all', 20, (select c.last_order_at::text || '~' || c.id from public.customers c where c.id = '00000000-0000-4000-d000-000000000014')",
    ],
    ["buscar «sofia 25»", "'sofia 25', 'all'"],
    ["buscar «966 000 12»", "'966 000 12', 'all'"],
    ["buscar «lucia» en no vuelven", "'lucia', 'lapsed'"],
  ].map(([name, args]) => ({
    name: `search_customers, ${name}`,
    as: OWNER,
    sql: `select public.search_customers(${args})`,
    tables: ["businesses", "customers"],
  })),
  {
    name: "get_customer con 3 años de pedidos",
    as: OWNER,
    sql: `select public.get_customer('${CUSTOMER}')`,
    tables: ["businesses", "customers", "orders", "order_lines"],
  },
  {
    name: "loyalty_overview",
    as: OWNER,
    sql: "select public.loyalty_overview(10)",
    tables: ["businesses", "customers"],
  },
  {
    name: "list_customer_orders",
    as: OWNER,
    sql: `select public.list_customer_orders('${CUSTOMER}')`,
    tables: ["businesses", "orders"],
  },
];

// Un caso hecho para fallar: busca dentro del nombre, así que lee la tabla entera. `pnpm db:perf --self-test`
export const selfTest = {
  name: "caso hecho para fallar",
  as: null,
  sql: "select count(*) from public.businesses where name like '%7%'",
  tables: ["businesses"],
};
