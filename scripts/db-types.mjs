// Los tipos de la base, generados desde el proyecto de desarrollo: pnpm db:types · pnpm db:types:check
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { format, resolveConfig } from "prettier";

import { ROOT } from "./lib/guard.mjs";

const FILE = join(ROOT, "src", "types", "database.ts");
const HEADER = "// Generado desde la base con `pnpm db:types`. No se edita a mano.\n";

const run = spawnSync(
  process.execPath,
  [join(ROOT, "scripts", "supabase.mjs"), "gen", "types", "--remote", "--schema", "public"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 64 * 1024 * 1024,
  },
);
if (run.status !== 0 || !run.stdout.includes("export type Database")) {
  console.error("No se pudieron generar los tipos de la base");
  process.exit(1);
}
// La CLI lo entrega sin alinear: se pasa por Prettier para que sus cambios se puedan leer en un diff
const generated = await format(HEADER + run.stdout, { ...(await resolveConfig(FILE)), filepath: FILE });

if (process.argv[2] === "check") {
  if (existsSync(FILE) && readFileSync(FILE, "utf8") === generated) {
    console.log("Los tipos de la base están al día");
    process.exit(0);
  }
  console.error("Los tipos no están al día: corre pnpm db:types");
  process.exit(1);
}

mkdirSync(dirname(FILE), { recursive: true });
writeFileSync(FILE, generated);
console.log("src/types/database.ts actualizado");
