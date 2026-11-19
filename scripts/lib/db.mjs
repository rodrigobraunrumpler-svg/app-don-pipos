// La conexión directa a la base de desarrollo y la transacción en la que corre cada prueba
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import pg from "pg";

import { assertDevProject, loadEnv, ROOT } from "./guard.mjs";

const SUPABASE = join(ROOT, "supabase");

/** Abre una conexión al pooler en modo sesión, con TLS verificado. Solo conecta al proyecto de desarrollo. */
export async function connect() {
  loadEnv();
  const poolerFile = join(SUPABASE, ".temp", "pooler-url");
  if (!existsSync(poolerFile)) throw new Error("Falta enlazar el proyecto: pnpm sb link <ref>");
  if (!process.env.SUPABASE_DB_PASSWORD) throw new Error("Falta SUPABASE_DB_PASSWORD en .env.local");

  const url = new URL(readFileSync(poolerFile, "utf8").trim());
  // El usuario del pooler es «postgres.<ref del proyecto>»
  assertDevProject(url.username.split(".")[1] ?? null, process.env.SUPABASE_DEV_PROJECT_REF, "Probar o medir la base");
  url.password = process.env.SUPABASE_DB_PASSWORD;

  const ca = readFileSync(join(SUPABASE, "certs", "supabase-root-2021-ca.crt"), "utf8");
  const client = new pg.Client({ connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true } });
  await client.connect();
  return client;
}

/** Las migraciones de supabase/migrations que la base todavía no tiene, en orden. */
export async function pendingMigrations(client) {
  const dir = join(SUPABASE, "migrations");
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => /^\d+_.+\.sql$/.test(file))
        .sort()
    : [];
  const history = await client.query(
    "select to_regclass('supabase_migrations.schema_migrations') is not null as found",
  );
  const applied = new Set(
    history.rows[0].found
      ? (await client.query("select version from supabase_migrations.schema_migrations")).rows.map((row) => row.version)
      : [],
  );
  return files
    .filter((file) => !applied.has(file.split("_")[0]))
    .map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") }));
}

/**
 * Corre `run` dentro de una transacción que siempre se deshace. Antes aplica las migraciones pendientes,
 * crea pgTAP y carga las ayudas de supabase/tests/_prelude.sql.
 */
export async function inTestTransaction(client, run) {
  await client.query("begin");
  try {
    for (const migration of await pendingMigrations(client)) {
      try {
        await client.query(migration.sql);
      } catch (error) {
        throw new Error(`${migration.file}: ${error.message}`, { cause: error });
      }
    }
    await client.query("create extension if not exists pgtap with schema extensions");
    await client.query(readFileSync(join(SUPABASE, "tests", "_prelude.sql"), "utf8"));
    return await run();
  } finally {
    await client.query("rollback");
  }
}
