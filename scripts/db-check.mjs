// La revisión completa de la base, en orden. Se detiene en la primera falla: pnpm db:check
import { spawnSync } from "node:child_process";

import { connect, pendingMigrations } from "./lib/db.mjs";

const client = await connect().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
const pending = await pendingMigrations(client);
await client.end();
if (pending.length > 0) {
  console.log(
    `Hay migraciones sin enviar: ${pending.map((migration) => migration.file).join(", ")}. Corre pnpm db:push`,
  );
  process.exit(1);
}

for (const script of ["db:lint", "db:advisors", "db:types:check", "test:db", "db:perf"]) {
  console.log(`\n── pnpm ${script}`);
  const run = spawnSync("pnpm", ["-s", script], { stdio: ["ignore", "inherit", "inherit"] });
  if (run.status !== 0) {
    console.log(`\npnpm db:check: falló en ${script}`);
    process.exit(run.status ?? 1);
  }
}
console.log("\npnpm db:check: todo pasa");
