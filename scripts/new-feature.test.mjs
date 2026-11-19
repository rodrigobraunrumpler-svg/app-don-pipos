import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { createFeature } from "./new-feature.mjs";

const root = () => mkdtempSync(join(tmpdir(), "features-"));

test("crea el módulo con sus seis carpetas, el índice y las claves", () => {
  const dir = root();
  createFeature("cash-counts", dir);
  for (const folder of ["api", "queries", "schema", "rules", "hooks", "components"])
    assert.ok(existsSync(join(dir, "cash-counts", folder)), folder);
  assert.match(readFileSync(join(dir, "cash-counts", "index.ts"), "utf8"), /export \{\};/);
  assert.match(
    readFileSync(join(dir, "cash-counts", "queries", "keys.ts"), "utf8"),
    /export const cashCountsKeys = \{ all: \["cash-counts"\] as const \};/,
  );
});

test("rechaza los nombres que no son kebab-case", () => {
  for (const name of ["Orders", "cash_counts", "2fast", "orders/", ""])
    assert.throws(() => createFeature(name, root()), /kebab-case/);
});

test("no pisa un módulo que ya existe", () => {
  const dir = root();
  createFeature("orders", dir);
  assert.throws(() => createFeature("orders", dir), /ya existe/);
});

test("devuelve los dos archivos que creó, sin los .gitkeep de la plantilla", () => {
  const dir = root();
  const created = createFeature("orders", dir).map((file) => relative(dir, file));
  assert.deepEqual(created.sort(), ["orders/index.ts", "orders/queries/keys.ts"]);
  assert.ok(!existsSync(join(dir, "orders", "api", ".gitkeep")));
});

test("por la terminal, un nombre que no vale termina con 1 y dice por qué", () => {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL("./new-feature.mjs", import.meta.url)), "Orders"], {
    encoding: "utf8",
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /kebab-case/);
});
