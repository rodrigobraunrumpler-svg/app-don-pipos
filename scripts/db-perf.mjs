// Mide las funciones principales con datos de muchos negocios: pnpm db:perf [--self-test]
// Todo corre en una transacción que se deshace: no queda nada guardado.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cases, selfTest } from "../supabase/perf/cases.mjs";
import { connect, inTestTransaction } from "./lib/db.mjs";
import { ROOT } from "./lib/guard.mjs";
import { evaluate } from "./lib/perf.mjs";

const MAX_MS = 50;
const SEQ_SCANS = `select relname, seq_scan::integer as scans from pg_stat_xact_user_tables
  where schemaname in ('public', 'private') and relname = any($1)`;

async function seqScans(client, tables) {
  const { rows } = await client.query(SEQ_SCANS, [tables]);
  return Object.fromEntries(tables.map((table) => [table, rows.find((row) => row.relname === table)?.scans ?? 0]));
}

// Corre el caso dos veces, cada una dentro de un savepoint que se deshace: la primera calienta, la segunda mide
async function measure(client, testCase) {
  let result;
  for (let round = 0; round < 2; round += 1) {
    await client.query("savepoint medida");
    try {
      const before = await seqScans(client, testCase.tables);
      if (testCase.as) await client.query("select tests.login_as($1)", [testCase.as]);
      const plan = await client.query(`explain (analyze, format json) ${testCase.sql}`);
      if (testCase.as) await client.query("select tests.logout()");
      const after = await seqScans(client, testCase.tables);
      result = {
        name: testCase.name,
        ms: Number(plan.rows[0]["QUERY PLAN"][0]["Execution Time"].toFixed(2)),
        seqScans: Object.fromEntries(testCase.tables.map((table) => [table, after[table] - before[table]])),
      };
    } finally {
      await client.query("rollback to savepoint medida");
    }
  }
  return result;
}

const selfTestMode = process.argv.includes("--self-test");
const problems = [];
const client = await connect().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
try {
  await inTestTransaction(client, async () => {
    await client.query(readFileSync(join(ROOT, "supabase", "perf", "seed.sql"), "utf8"));
    for (const testCase of selfTestMode ? [selfTest] : cases) {
      const result = await measure(client, testCase);
      const found = evaluate(result, testCase.maxMs ?? MAX_MS);
      console.log(`${found.length === 0 ? "ok    " : "FALLA "} ${result.name}: ${result.ms} ms`);
      problems.push(...found);
    }
  });
} finally {
  await client.end();
}

if (selfTestMode) {
  if (problems.length === 0) {
    console.log("El medidor NO marcó el caso hecho para fallar");
    process.exit(1);
  }
  console.log("El medidor marca el caso hecho para fallar: funciona");
  process.exit(0);
}
for (const problem of problems) console.log(`         ${problem}`);
console.log(
  problems.length === 0
    ? `\n${cases.length} casos: todos con índice y en menos de ${MAX_MS} ms`
    : `\n${problems.length} problema(s)`,
);
process.exit(problems.length === 0 ? 0 : 1);
