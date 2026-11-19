// Las llaves viven en archivos .env que no entran al repositorio. Esta prueba cuida la única barrera local: .gitignore
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// --no-index: se pregunta por las reglas de .gitignore, esté o no el archivo ya guardado en git
const isIgnored = (file) => spawnSync("git", ["check-ignore", "-q", "--no-index", file], { cwd: ROOT }).status === 0;

test("ningún archivo .env entra al repositorio", () => {
  for (const file of [".env", ".env.local", ".env.production", ".env.development.local", ".env.bak"])
    assert.ok(isIgnored(file), `${file} debería estar en .gitignore`);
});

test(".env.example sí entra: es la plantilla, sin llaves", () => {
  assert.ok(!isIgnored(".env.example"));
});
