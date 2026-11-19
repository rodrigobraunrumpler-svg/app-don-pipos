// La tabla «Quién puede usar a quién» de PROJECT_CONTEXT.md §9.1, escrita celda por celda.
// `pnpm lint:rules` arma, para cada fila, un archivo que importa TODAS las columnas, y comprueba que el lint
// deje pasar solo las de su lista: lo que una fila no nombra está prohibido.
// Si cambia la tabla del documento, cambia esta. Si alguien afloja eslint/structure.mjs sin cambiar esta, lint:rules falla.

// Las columnas: lo que se intenta importar. Un archivo de ejemplo de cada lugar (dentro de tools/lint-fixtures) o un paquete.
// Las filas de módulo son del módulo «orders»; «products» hace de «otro módulo»
export const TARGETS = {
  "orders/api": "src/features/orders/api/orders.ts",
  "orders/queries": "src/features/orders/queries/orders.ts",
  "orders/schema": "src/features/orders/schema/order.ts",
  "orders/rules": "src/features/orders/rules/totals.ts",
  "orders/hooks": "src/features/orders/hooks/use-orders.ts",
  "orders/components": "src/features/orders/components/order-row.tsx",
  "orders/constants.ts": "src/features/orders/constants.ts",
  "orders/index.ts": "src/features/orders/index.ts",

  "products/api": "src/features/products/api/products.ts",
  "products/queries": "src/features/products/queries/products.ts",
  "products/schema": "src/features/products/schema/product.ts",
  "products/rules": "src/features/products/rules/price.ts",
  "products/hooks": "src/features/products/hooks/use-products.ts",
  "products/components": "src/features/products/components/product-avatar.tsx",
  "products/constants.ts": "src/features/products/constants.ts",
  "products/index.ts": "src/features/products/index.ts",

  "components/ui": "src/components/ui/button.tsx",
  theme: "src/theme/tokens.ts",
  "lib/money": "src/lib/money.ts",
  "lib/dates": "src/lib/dates.ts",
  "lib (otro archivo)": "src/lib/errors.ts",
  "lib/supabase.ts": "src/lib/supabase.ts",
  types: "src/types/database.ts",
  "src/test": "src/test/render.tsx",
  "src/app": "src/app/index.tsx",
  "assets (imagen)": "assets/icon.png",
  "assets (código)": "assets/not-an-image.ts",
  "archivo fuera de lugar": "src/outside-structure.ts",

  react: "react",
  "react-native": "react-native",
  "expo-router": "expo-router",
  "@tanstack/react-query": "@tanstack/react-query",
  zod: "zod",
  "otro paquete (date-fns)": "date-fns",
  "@supabase/supabase-js": "@supabase/supabase-js",
  "Node (node:fs)": "node:fs",
};

// Grupos de columnas, para escribir las filas como en el documento
const LIB = ["lib/money", "lib/dates", "lib (otro archivo)"]; // «lib (menos supabase)»
const REACT = ["react", "react-native", "expo-router", "@tanstack/react-query"];
const PACKAGES = [...REACT, "zod", "otro paquete (date-fns)", "Node (node:fs)"]; // todos menos @supabase/*
const ANY_INDEX = ["orders/index.ts", "products/index.ts"];

const components = [
  "orders/components",
  "orders/hooks",
  "orders/queries",
  "orders/rules",
  "orders/schema",
  "orders/constants.ts",
  "products/index.ts",
  "components/ui",
  "theme",
  ...LIB,
  "assets (imagen)",
  ...PACKAGES,
];
const rules = ["orders/rules", "orders/schema", "orders/constants.ts", "lib/money", "lib/dates"]; // ningún paquete
const lib = [...LIB, "types", ...PACKAGES];
const testHelpers = ["src/test", ...ANY_INDEX, "components/ui", "theme", ...LIB, "src/app", ...PACKAGES];

// Las filas: quién importa (`file`, un archivo de ese lugar) y qué puede usar (`canUse`). Su propia carpeta siempre puede
export const ROWS = {
  "src/app (pantallas)": {
    file: "src/app/matrix-row.tsx",
    canUse: ["src/app", ...ANY_INDEX, "components/ui", "theme", ...LIB, "assets (imagen)", ...PACKAGES],
  },
  "components/": { file: "src/features/orders/components/matrix-row.tsx", canUse: components },
  "hooks/": {
    file: "src/features/orders/hooks/matrix-row.ts",
    canUse: [
      "orders/hooks",
      "orders/queries",
      "orders/rules",
      "orders/schema",
      "orders/constants.ts",
      "products/index.ts",
      ...LIB,
      ...PACKAGES,
    ],
  },
  "queries/": {
    file: "src/features/orders/queries/matrix-row.ts",
    canUse: ["orders/queries", "orders/api", "orders/schema", ...LIB, ...PACKAGES],
  },
  "api/": {
    file: "src/features/orders/api/matrix-row.ts",
    canUse: [
      "orders/api",
      "orders/schema",
      ...LIB,
      "lib/supabase.ts",
      "types",
      "zod",
      "otro paquete (date-fns)",
      "Node (node:fs)",
      "@supabase/supabase-js", // sin React
    ],
  },
  "rules/": { file: "src/features/orders/rules/matrix-row.ts", canUse: rules },
  "schema/": { file: "src/features/orders/schema/matrix-row.ts", canUse: ["orders/schema", "zod"] },
  "constants.ts": { file: "src/features/orders/constants.ts", canUse: ["zod"] },
  "index.ts del módulo": {
    file: "src/features/orders/index.ts",
    canUse: ["orders/components", "orders/hooks", "orders/queries", "orders/rules", "orders/schema", ...PACKAGES],
  },
  "components/ui": {
    file: "src/components/ui/matrix-row.tsx",
    canUse: ["components/ui", "theme", ...LIB, "assets (imagen)", ...PACKAGES],
  },
  lib: { file: "src/lib/matrix-row.ts", canUse: lib },
  "lib/supabase.ts": { file: "src/lib/supabase.ts", canUse: [...lib, "@supabase/supabase-js"] },
  theme: { file: "src/theme/matrix-row.ts", canUse: ["theme", ...PACKAGES] },
  types: { file: "src/types/matrix-row.ts", canUse: ["types", ...PACKAGES] },
  "src/test (ayudas de prueba)": { file: "src/test/matrix-row.tsx", canUse: testHelpers },

  // Una prueba puede lo mismo que su carpeta, más src/test
  "prueba en rules/": { file: "src/features/orders/rules/matrix-row.test.ts", canUse: [...rules, "src/test"] },
  "prueba en components/": {
    file: "src/features/orders/components/matrix-row.test.tsx",
    canUse: [...components, "src/test"],
  },
  "prueba en lib": { file: "src/lib/matrix-row.test.ts", canUse: [...lib, "src/test"] },
  "prueba de lib/supabase.ts": {
    file: "src/lib/supabase.test.ts",
    canUse: [...lib, "src/test", "lib/supabase.ts", "@supabase/supabase-js"],
  },
  "prueba de una pantalla (src/test/routes)": { file: "src/test/routes/matrix-row.test.tsx", canUse: testHelpers },
};
