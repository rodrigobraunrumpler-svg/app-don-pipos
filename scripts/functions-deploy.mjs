// Sube las funciones del acceso al proyecto de desarrollo, con su secreto: pnpm functions:deploy
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadEnv, ROOT } from "./lib/guard.mjs";

const FUNCTIONS = ["sign-in-with-pin", "change-pin"];

function sb(args) {
  const run = spawnSync(process.execPath, [join(ROOT, "scripts", "supabase.mjs"), ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (run.status !== 0) process.exit(run.status ?? 1);
}

loadEnv();
// La primera vez se genera el secreto de las contraseñas internas. Cambiarlo obliga a un `pnpm owner reset-pin`.
if (!process.env.AUTH_PASSWORD_SECRET) {
  const secret = randomBytes(48).toString("base64url");
  appendFileSync(
    join(ROOT, ".env.local"),
    `\n# Secreto de las contraseñas internas de los dueños. No cambiarlo sin un pnpm owner reset-pin\nAUTH_PASSWORD_SECRET=${secret}\n`,
  );
  process.env.AUTH_PASSWORD_SECRET = secret;
  console.log("AUTH_PASSWORD_SECRET generado y guardado en .env.local");
}

// El secreto viaja en un archivo temporal que solo tiene esa línea, y que se borra pase lo que pase
const dir = mkdtempSync(join(tmpdir(), "secretos-"));
try {
  const file = join(dir, "funciones.env");
  writeFileSync(file, `AUTH_PASSWORD_SECRET=${process.env.AUTH_PASSWORD_SECRET}\n`, { mode: 0o600 });
  sb(["secrets", "set", "--env-file", file, "--yes"]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

sb(["functions", "deploy", ...FUNCTIONS, "--use-api", "--no-verify-jwt", "--yes"]);
