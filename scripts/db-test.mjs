// Corre las pruebas de la base (pgTAP) contra el proyecto de desarrollo: pnpm test:db [texto]
// Cada archivo corre en su propia transacción, que siempre se deshace: no queda nada guardado.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { connect, inTestTransaction, leftoverProblems, pendingMigrations } from "./lib/db.mjs";
import { ROOT } from "./lib/guard.mjs";
import { assertIsolated, parseTap } from "./lib/sql.mjs";

const TESTS = join(ROOT, "supabase", "tests");
const filter = process.argv[2] ?? "";
const files = readdirSync(TESTS)
  .filter((file) => file.includes(filter))
  .sort();
const sqlFiles = files.filter((file) => file.endsWith(".test.sql"));
const concurrentFiles = files.filter((file) => file.endsWith(".concurrent.mjs"));

async function runSqlFile(client, file) {
  const sql = readFileSync(join(TESTS, file), "utf8");
  assertIsolated(sql, file);
  const results = await inTestTransaction(client, () => client.query(sql));
  const lines = [results]
    .flat()
    .flatMap((result) => result.rows ?? [])
    .flatMap((row) => Object.values(row))
    .filter((value) => typeof value === "string")
    .flatMap((value) => value.split("\n"));
  const tap = parseTap(lines);
  const ran = tap.passed + tap.failed.length;
  const problems = tap.failed.map((test) => `falló: ${test}`);
  if (tap.planned === null) problems.push("no declara su plan (select plan(n))");
  else if (ran !== tap.planned) problems.push(`el plan dice ${tap.planned} pruebas y corrieron ${ran}`);
  return { passed: tap.passed, ran, problems, notes: lines.filter((line) => line.trimStart().startsWith("#")) };
}

async function runConcurrentFile(file) {
  const { default: test } = await import(pathToFileURL(join(TESTS, file)).href);
  const sessions = [];
  const openSession = async () => {
    const session = await connect();
    sessions.push(session);
    return session;
  };
  try {
    await test({ openSession, assert });
  } finally {
    for (const session of sessions) {
      await session.query("rollback").catch(() => {});
      await session.end().catch(() => {});
    }
  }
}

let failedFiles = 0;
let passedTests = 0;
const client = await connect().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
try {
  for (const file of sqlFiles) {
    try {
      const { passed, ran, problems, notes } = await runSqlFile(client, file);
      passedTests += passed;
      if (problems.length === 0) {
        console.log(`ok     ${file}: ${passed} de ${ran}`);
        continue;
      }
      failedFiles += 1;
      console.log(`FALLA  ${file}: ${passed} de ${ran}`);
      for (const line of [...problems, ...notes]) console.log(`         ${line}`);
    } catch (error) {
      failedFiles += 1;
      console.log(`FALLA  ${file}: ${error.message}`);
    }
  }

  const pending = concurrentFiles.length > 0 ? await pendingMigrations(client) : [];
  if (pending.length > 0) {
    console.log(
      `espera ${concurrentFiles.length} prueba(s) de dos conexiones: primero envía las migraciones (pnpm db:push)`,
    );
  } else {
    for (const file of concurrentFiles) {
      try {
        await runConcurrentFile(file);
        passedTests += 1;
        console.log(`ok     ${file}`);
      } catch (error) {
        failedFiles += 1;
        console.log(`FALLA  ${file}: ${error.message}`);
      }
    }
  }

  // Después de todo, la base tiene que quedar como estaba: sin ayudas de prueba, sin pgTAP y sin usuarios de prueba
  for (const problem of await leftoverProblems(client)) {
    failedFiles += 1;
    console.log(`FALLA  ${problem}: una prueba no se deshizo`);
  }
} finally {
  await client.end();
}

const total = sqlFiles.length + concurrentFiles.length;
if (total === 0) {
  console.log(`Ninguna prueba coincide con «${filter}»`);
  process.exit(1);
}
console.log(
  failedFiles === 0
    ? `\n${total} archivos, ${passedTests} pruebas: todo pasa`
    : `\n${failedFiles} de ${total} archivos con fallas`,
);
process.exit(failedFiles === 0 ? 0 : 1);
