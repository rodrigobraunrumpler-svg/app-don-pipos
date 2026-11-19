// La conexión directa a la base de desarrollo y la transacción en la que corre cada prueba
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import pg from "pg";

import { assertDevProject, loadEnv, ROOT } from "./guard.mjs";
import { assertIsolated } from "./sql.mjs";

const SUPABASE = join(ROOT, "supabase");
const MIGRATIONS = join(SUPABASE, "migrations");
const PRELUDE = join(SUPABASE, "tests", "_prelude.sql");
// Una marca que vive solo mientras dura la transacción de prueba: si falta al final, la transacción se cerró antes
const MARK = "varmar.test_transaction";

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
export async function pendingMigrations(client, dir = MIGRATIONS) {
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

// ¿Sigue abierta la transacción de prueba? Una transacción que falló (25P02) sigue abierta hasta el rollback
async function stillInTestTransaction(client) {
  try {
    const { rows } = await client.query(`select current_setting('${MARK}', true) as mark`);
    return rows[0]?.mark === "on";
  } catch (error) {
    if (error.code === "25P02") return true;
    throw error;
  }
}

/**
 * Corre `run` dentro de una transacción que siempre se deshace. Antes aplica las migraciones pendientes,
 * crea pgTAP y carga las ayudas de supabase/tests/_prelude.sql.
 * Nada que abra o cierre una transacción llega a la base: lo que se enviara después de un commit quedaría guardado.
 */
export async function inTestTransaction(client, run, { migrationsDir = MIGRATIONS, prelude = PRELUDE } = {}) {
  const pending = await pendingMigrations(client, migrationsDir);
  const preludeSql = readFileSync(prelude, "utf8");
  for (const migration of pending) assertIsolated(migration.sql, migration.file);
  assertIsolated(preludeSql, "_prelude.sql");

  await client.query("begin");
  await client.query(`select set_config('${MARK}', 'on', true)`);
  let outcome;
  try {
    for (const migration of pending) {
      try {
        await client.query(migration.sql);
      } catch (error) {
        throw new Error(`${migration.file}: ${error.message}`, { cause: error });
      }
    }
    await client.query("create extension if not exists pgtap with schema extensions");
    await client.query(preludeSql);
    outcome = { value: await run() };
  } catch (error) {
    outcome = { error };
  }

  const open = await stillInTestTransaction(client);
  await client.query("rollback");
  // Lo que no se deshace con la transacción (sentencias preparadas, bloqueos de sesión) no pasa a la prueba siguiente
  await client.query("discard all");
  // Esta falla tapa cualquier otra: algo pudo quedar guardado
  if (!open) {
    throw new Error(
      "La transacción de prueba se cerró antes de tiempo: lo que corrió después pudo quedar guardado en la base de desarrollo. Revísala con pnpm sb db query.",
    );
  }
  if ("error" in outcome) throw outcome.error;
  return outcome.value;
}

/** Lo que quedó en la base después de las pruebas, con su nombre. Sin nada, una lista vacía. */
export async function leftoverProblems(client) {
  const {
    rows: [row],
  } = await client.query(`select to_regnamespace('tests') is not null as tests_schema,
      exists (select 1 from pg_catalog.pg_extension where extname = 'pgtap') as pgtap,
      (select count(*)::integer from auth.users where email like '%@prueba.invalid') as users`);
  const problems = [];
  if (row.tests_schema) problems.push("quedó el esquema tests");
  if (row.pgtap) problems.push("quedó la extensión pgtap");
  if (row.users > 0) problems.push(`quedaron ${row.users} usuarios de prueba (@prueba.invalid)`);
  return problems;
}
