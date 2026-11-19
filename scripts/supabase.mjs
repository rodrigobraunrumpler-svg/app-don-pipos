// Corre la CLI de Supabase con .env.local cargado y con la sesión propia de esta app: pnpm sb <argumentos>
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

import { assertDevProject, linkedRef, loadEnv, ROOT, yesTarget } from "./lib/guard.mjs";

loadEnv();
// La sesión de esta app vive aparte de la de otros proyectos de la máquina
process.env.SUPABASE_HOME ??= join(homedir(), ".supabase-varmar-app");

const args = process.argv.slice(2);
const target = yesTarget(args, process.env, linkedRef());
if (target !== undefined) {
  try {
    assertDevProject(target, process.env.SUPABASE_DEV_PROJECT_REF, "Confirmar cambios en la nube (--yes)");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const run = spawnSync(join(ROOT, "node_modules", ".bin", "supabase"), args, { stdio: "inherit", cwd: ROOT });
process.exit(run.status ?? 1);
