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

const PROJECT_REF = /^[a-z]{20}$/;
// Opciones con las que la CLI elige otro proyecto u otra carpeta. Al confirmar, solo vale el proyecto enlazado.
const OTHER_TARGET_FLAGS = ["--workdir", "--project-ref", "--project-id", "--db-url"];

const describe = (target) => (target.includes("://") ? "una URL de base de datos" : target);

/**
 * Si el comando confirma cambios en la nube (cualquier `--yes…` o `SUPABASE_YES`), comprueba que solo pueda tocar el
 * proyecto de desarrollo. Devuelve el problema, en español, o null si no hay ninguno. Nunca repite una URL completa.
 */
export function confirmedCommandProblem(args, env, linked, devRef) {
  const confirms = args.some((arg) => arg === "--yes" || arg.startsWith("--yes=")) || Boolean(env.SUPABASE_YES);
  if (!confirms) return null;

  const refuse = (detail) =>
    `Confirmar cambios en la nube (--yes) solo corre en el proyecto de desarrollo (${devRef || "SUPABASE_DEV_PROJECT_REF sin definir"}). ${detail}`;

  const otherFlag = args.find((arg) => OTHER_TARGET_FLAGS.some((flag) => arg === flag || arg.startsWith(`${flag}=`)));
  if (otherFlag) return refuse(`Quita ${otherFlag.split("=")[0]}: al confirmar, el comando usa el proyecto enlazado.`);

  // --remote=<valor> y «--remote <valor>»: la CLI lee los dos como el proyecto de destino
  const targets = [];
  args.forEach((arg, index) => {
    if (arg.startsWith("--remote=")) targets.push(arg.slice("--remote=".length));
    else if (arg === "--remote" && args[index + 1] && !args[index + 1].startsWith("-")) targets.push(args[index + 1]);
    // Un proyecto o una URL escritos sueltos («projects delete <ref>», «link <ref>»)
    else if (PROJECT_REF.test(arg) || arg.includes("://")) targets.push(arg);
  });
  if (targets.length === 0) targets.push(linked);

  const wrong = targets.find((target) => !target || !devRef || target !== devRef);
  return wrong === undefined ? null : refuse(`Destino: ${wrong ? describe(wrong) : "ninguno enlazado"}.`);
}

/** Las variables con que corre la CLI: sin las que eligen otro proyecto o carpeta, y con la sesión propia de esta app. */
export function childEnv(env, home) {
  const { SUPABASE_PROJECT_ID: _project, SUPABASE_WORKDIR: _workdir, ...rest } = env;
  return { ...rest, SUPABASE_HOME: env.SUPABASE_HOME ?? join(home, ".supabase-varmar-app") };
}
