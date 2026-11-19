import assert from "node:assert/strict";
import { test } from "node:test";

import { DEMO_CATALOG } from "./demo-catalog.mjs";

test("los cinco alfajores confirmados (PROJECT_CONTEXT.md §7), con sus precios", () => {
  assert.deepEqual(
    DEMO_CATALOG.map((product) => [product.name, product.priceCents]),
    [
      ["Coqueta", 1200],
      ["Morenita", 1200],
      ["Limon Kiss", 1200],
      ["Manteadita", 1200],
      ["Pipo Crush", 1300],
    ],
  );
});

test("mínimos y stock DEMO enteros y no negativos, y nombres sin repetir", () => {
  for (const product of DEMO_CATALOG) {
    assert.ok(Number.isInteger(product.minStock) && product.minStock >= 0, product.name);
    assert.ok(Number.isInteger(product.stock) && product.stock >= 0, product.name);
  }
  assert.equal(new Set(DEMO_CATALOG.map((product) => product.name.toLowerCase())).size, DEMO_CATALOG.length);
});
