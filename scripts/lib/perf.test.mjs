import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluate } from "./perf.mjs";

test("un caso rápido y con índice no tiene problemas", () => {
  assert.deepEqual(evaluate({ name: "get_business", ms: 1.8, seqScans: { businesses: 0 } }, 50), []);
});

test("avisa cuando tarda más del máximo", () => {
  assert.deepEqual(evaluate({ name: "get_business", ms: 50.01, seqScans: {} }, 50), [
    "get_business: tardó 50.01 ms (máximo 50)",
  ]);
});

test("avisa por cada tabla leída entera", () => {
  assert.deepEqual(evaluate({ name: "lista", ms: 3, seqScans: { businesses: 1, business_settings: 0 } }, 50), [
    "lista: leyó businesses entera, sin índice",
  ]);
});
