// Los consejos de seguridad y rendimiento de Supabase: pnpm db:advisors. Falla con cualquier aviso no aceptado.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { ACCEPTED_ADVICE, pendingAdvice } from "./lib/advisors.mjs";
import { ROOT } from "./lib/guard.mjs";

const run = spawnSync(
  process.execPath,
  [join(ROOT, "scripts", "supabase.mjs"), "db", "advisors", "--remote", "--output-format", "json"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  },
);
if (run.status !== 0) process.exit(run.status ?? 1);

const { results = [] } = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")));
for (const advice of results.filter((item) => item.name in ACCEPTED_ADVICE)) {
  console.log(`aceptado  ${advice.title}: ${ACCEPTED_ADVICE[advice.name]}`);
}
const pending = pendingAdvice(results);
for (const advice of pending) console.log(`${advice.level.padEnd(8)}  ${advice.title}: ${advice.detail}`);
console.log(
  pending.length === 0 ? "Consejos de Supabase: nada pendiente" : `\n${pending.length} consejo(s) pendiente(s)`,
);
process.exit(pending.length === 0 ? 0 : 1);
