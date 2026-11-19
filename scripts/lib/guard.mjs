// Lo que cambia o llena la base solo corre en el proyecto de desarrollo
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** El proyecto de Supabase al que está enlazada esta copia del repositorio, o null. */
export function linkedRef() {
  const file = join(ROOT, "supabase", ".temp", "project-ref");
  return existsSync(file) ? readFileSync(file, "utf8").trim() : null;
}

/** Lanza si `ref` no es el proyecto de desarrollo (`SUPABASE_DEV_PROJECT_REF`) o si falta alguno de los dos. */
export function assertDevProject(ref, devRef, what) {
  if (!ref || !devRef || ref !== devRef) {
    throw new Error(
      `${what} solo corre en el proyecto de desarrollo. Enlazado: ${ref || "ninguno"}; SUPABASE_DEV_PROJECT_REF: ${devRef || "sin definir"}.`,
    );
  }
}

/** Carga .env.local si existe. No pisa las variables que ya vienen puestas. */
export function loadEnv() {
  const file = join(ROOT, ".env.local");
  if (existsSync(file)) process.loadEnvFile(file);
}

const isYes = (value) => !/^(false|no|off|0|n)$/i.test(value);

/**
 * A qué proyecto le diría «sí» este comando de la CLI. Devuelve `undefined` si no confirma nada
 * (ni `--yes` ni `SUPABASE_YES`); si confirma, el valor de `--remote=<…>` o, sin él, el proyecto enlazado.
 */
export function yesTarget(args, env, linked) {
  const flag = args.findLast((arg) => arg === "--yes" || arg.startsWith("--yes="));
  const confirms = flag ? isYes(flag.split("=")[1] ?? "true") : Boolean(env.SUPABASE_YES);
  if (!confirms) return undefined;
  const remote = args.find((arg) => arg.startsWith("--remote="));
  return remote ? remote.slice("--remote=".length) : linked;
}
