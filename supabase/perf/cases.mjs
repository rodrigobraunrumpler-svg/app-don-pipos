// Lo que el medidor corre. Cada caso: con qué usuario, qué consulta y qué tablas no puede leer enteras.
// `maxMs` vale 50 si no se pone. Cada fase suma aquí sus funciones principales.

// El dueño del negocio 2,500 de los 5,000 de supabase/perf/seed.sql
const OWNER = "00000000-0000-4000-9000-0000000009c4";

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
];

// Un caso hecho para fallar: busca dentro del nombre, así que lee la tabla entera. `pnpm db:perf --self-test`
export const selfTest = {
  name: "caso hecho para fallar",
  as: null,
  sql: "select count(*) from public.businesses where name like '%7%'",
  tables: ["businesses"],
};
