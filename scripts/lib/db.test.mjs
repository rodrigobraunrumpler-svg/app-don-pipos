// El corredor de pruebas con un cliente simulado: no se conecta a ninguna base
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { inTestTransaction, leftoverProblems } from "./db.mjs";

function fakeClient({ mark = "on", markError } = {}) {
  const sent = [];
  return {
    sent,
    async query(sql) {
      sent.push(sql.trim().split("\n")[0]);
      if (sql.includes("to_regclass('supabase_migrations.schema_migrations')")) return { rows: [{ found: true }] };
      if (sql.includes("from supabase_migrations.schema_migrations")) return { rows: [] };
      if (sql.includes("current_setting(")) {
        if (markError) throw Object.assign(new Error("transacción abortada"), { code: markError });
        return { rows: [{ mark }] };
      }
      return { rows: [] };
    },
  };
}

function fixtures(migrations) {
  const dir = mkdtempSync(join(tmpdir(), "runner-"));
  const migrationsDir = join(dir, "migrations");
  const prelude = join(dir, "_prelude.sql");
  writeFileSync(prelude, "create schema tests;\n");
  return { migrationsDir, prelude, dir, migrations };
}

async function withMigrations(files) {
  const { mkdirSync } = await import("node:fs");
  const f = fixtures();
  mkdirSync(f.migrationsDir);
  for (const [name, sql] of Object.entries(files)) writeFileSync(join(f.migrationsDir, name), sql);
  return { migrationsDir: f.migrationsDir, prelude: f.prelude };
}

test("una migración pendiente que cierra la transacción no se envía: no llega nada a la base", async () => {
  const options = await withMigrations({
    "20990101000000_ok.sql": "create table zz (id integer);\n",
    "20990101000001_mala.sql": "create table yy (id integer);\ncommit;\n",
  });
  const client = fakeClient();
  await assert.rejects(
    inTestTransaction(client, async () => "nada", options),
    /20990101000001_mala\.sql: .*\(commit\)/,
  );
  assert.ok(!client.sent.includes("begin"), "no se abrió la transacción");
});

test("si la transacción se cerró antes de tiempo, el corredor falla fuerte", async () => {
  const options = await withMigrations({});
  const client = fakeClient({ mark: "" });
  await assert.rejects(
    inTestTransaction(client, async () => "nada", options),
    /se cerró antes de tiempo/,
  );
  assert.ok(client.sent.includes("rollback"));
});

test("una transacción que falló sigue abierta: se ve el error de la prueba, no el del corredor", async () => {
  const options = await withMigrations({});
  const client = fakeClient({ markError: "25P02" });
  await assert.rejects(
    inTestTransaction(
      client,
      async () => {
        throw new Error("la prueba falló");
      },
      options,
    ),
    /la prueba falló/,
  );
});

test("después de deshacer, borra el estado de la sesión para la prueba siguiente", async () => {
  const options = await withMigrations({});
  const client = fakeClient();
  assert.equal(await inTestTransaction(client, async () => "listo", options), "listo");
  assert.deepEqual(client.sent.slice(-2), ["rollback", "discard all"]);
});

test("lo que quedó en la base después de las pruebas se nombra", async () => {
  const client = { query: async () => ({ rows: [{ tests_schema: true, pgtap: true, users: 2 }] }) };
  assert.deepEqual(await leftoverProblems(client), [
    "quedó el esquema tests",
    "quedó la extensión pgtap",
    "quedaron 2 usuarios de prueba (@prueba.invalid)",
  ]);
  const clean = { query: async () => ({ rows: [{ tests_schema: false, pgtap: false, users: 0 }] }) };
  assert.deepEqual(await leftoverProblems(clean), []);
});
