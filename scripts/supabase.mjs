// Corre la CLI de Supabase con .env.local cargado y con la sesión propia de esta app: pnpm sb <argumentos>
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

import { childEnv, confirmedCommandProblem, linkedRef, loadEnv, ROOT } from "./lib/guard.mjs";

loadEnv();

const args = process.argv.slice(2);
const problem = confirmedCommandProblem(args, process.env, linkedRef(), process.env.SUPABASE_DEV_PROJECT_REF);
if (problem) {
  console.error(problem);
  process.exit(1);
}

// Sin terminal (un script, un asistente), la entrada se cierra: «migration new» la lee y se quedaría esperando
const stdin = process.stdin.isTTY ? "inherit" : "ignore";
const run = spawnSync(join(ROOT, "node_modules", ".bin", "supabase"), args, {
  stdio: [stdin, "inherit", "inherit"],
  cwd: ROOT,
  env: childEnv(process.env, homedir()),
});
process.exit(run.status ?? 1);
