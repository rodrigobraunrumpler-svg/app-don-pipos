// El programa de la copia de seguridad del VPS (donpipos-backup.sh), con programas falsos en lugar de pg_dump, pg_restore,
// psql, rclone y curl: cada uno anota cómo lo llamaron, y uno puede fallar a pedido (FAIL_CMD)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "donpipos-backup.sh");
const ROOT = mkdtempSync(join(tmpdir(), "donpipos-backup-"));
after(() => rmSync(ROOT, { recursive: true, force: true }));

// Un programa falso: anota su nombre y sus argumentos (uno por línea), y lo que le llega por la entrada si es psql
const FAKE = `#!/usr/bin/env bash
name="$(basename "$0")"
{ echo "== $name"; printf '%s\\n' "$@"; [ -n "\${PGPASSWORD:-}" ] && echo "(PGPASSWORD en el entorno)"; } >> "$CALLS_LOG"
if [ "$name" = psql ]; then { echo "-- stdin"; cat; } >> "$CALLS_LOG"; fi
if [ "$name" = "$FAIL_CMD" ] && { [ -z "$FAIL_ARG" ] || printf '%s\\n' "$@" | grep -qx -- "$FAIL_ARG"; }; then
  echo "$FAIL_MESSAGE" >&2; exit 1
fi
if [ "$name" = pg_dump ]; then
  for arg in "$@"; do case "$arg" in --file=*) printf 'PGDMP-falso' > "\${arg#--file=}";; esac; done
fi
exit 0
`;

let runs = 0;
function run({ env = {}, envFile } = {}) {
  runs += 1;
  const dir = join(ROOT, `run-${runs}`);
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  for (const name of ["pg_dump", "pg_restore", "psql", "rclone", "curl"]) {
    writeFileSync(join(bin, name), FAKE);
    chmodSync(join(bin, name), 0o755);
  }
  const file = join(dir, "backup.env");
  writeFileSync(
    file,
    envFile ??
      "DATABASE_URL=postgresql://postgres@db.invalid:5432/postgres\nPGPASSWORD=clave-falsa\nRCLONE_REMOTE=r2:donpipos-prueba\nHEARTBEAT_URL=https://hc-ping.invalid/latido\n",
  );
  const log = join(dir, "calls.log");
  writeFileSync(log, "");
  const result = spawnSync("bash", [SCRIPT], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      BACKUP_ENV_FILE: file,
      BACKUP_DIR: join(dir, "backups"),
      CALLS_LOG: log,
      PG_DUMP: join(bin, "pg_dump"),
      PG_RESTORE: join(bin, "pg_restore"),
      PSQL: join(bin, "psql"),
      RCLONE: join(bin, "rclone"),
      CURL: join(bin, "curl"),
      FAIL_CMD: "",
      FAIL_ARG: "",
      FAIL_MESSAGE: "",
      ...env,
    },
  });
  const calls = readFileSync(log, "utf8")
    .split("== ")
    .filter(Boolean)
    .map((block) => block.trimEnd().split("\n"));
  return { ...result, calls, dir };
}

const names = (calls) =>
  calls.map(([name, first]) => (["rclone", "pg_restore"].includes(name) ? `${name} ${first}` : name));
const psqlVar = (call, name) => call.find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1);

test("todo bien: copia, revisa, sube, limpia, anota que salió bien y avisa al monitor", () => {
  const { status, calls, stderr } = run();
  assert.equal(status, 0, stderr);
  // La revisión lee la copia entera (no solo su índice): la convierte a SQL y lo descarta
  assert.deepEqual(names(calls), [
    "pg_dump",
    "pg_restore --file=/dev/null",
    "rclone copyto",
    "rclone delete",
    "psql",
    "curl",
  ]);
  const [dump] = calls;
  assert.ok(dump.includes("--format=custom") && dump.includes("--no-owner") && dump.includes("--no-privileges"));
  const psql = calls[4];
  assert.equal(psqlVar(psql, "ok"), "true");
  assert.equal(psqlVar(psql, "size"), String("PGDMP-falso".length));
  assert.ok(psql.some((line) => line.includes("private.record_backup")));
  assert.equal(calls[5].at(-1), "https://hc-ping.invalid/latido");
  const remove = calls[3];
  assert.ok(remove.includes("--min-age") && remove.includes("30d") && remove.includes("r2:donpipos-prueba"));
  // Solo las copias de Don Pipos: nada más de lo que haya en ese lugar de R2
  assert.equal(remove[remove.indexOf("--include") + 1], "donpipos-*.dump");
});

test("KEEP_DAYS tiene que ser un número de días, al menos 1: con 0 borraría hasta la copia de hoy", () => {
  for (const days of ["0", "-3", "muchos"]) {
    const { status, calls, stderr } = run({ env: { KEEP_DAYS: days } });
    assert.equal(status, 1, days);
    assert.match(stderr, /KEEP_DAYS/);
    assert.deepEqual(calls, []);
  }
});

test("un paso inesperado que falla (no se puede crear la carpeta) también anota la falla y avisa «fail»", () => {
  const blocker = join(ROOT, "no-es-carpeta");
  writeFileSync(blocker, "");
  const { status, calls, stderr } = run({ env: { BACKUP_DIR: join(blocker, "backups") } });
  assert.equal(status, 1);
  assert.deepEqual(names(calls), ["psql", "curl"], stderr);
  assert.equal(psqlVar(calls[0], "ok"), "false");
  assert.match(psqlVar(calls[0], "error"), /^preparar: /);
  assert.equal(calls[1].at(-1), "https://hc-ping.invalid/latido/fail");
});

test("un error largo se recorta sin partir una letra: la falla igual se puede anotar", () => {
  // 300 «€» son 900 bytes: el recorte a 500 cae en medio de una letra
  const { status, calls } = run({ env: { FAIL_CMD: "pg_dump", FAIL_MESSAGE: "€".repeat(300) } });
  assert.equal(status, 1);
  const error = psqlVar(
    calls.find(([name]) => name === "psql"),
    "error",
  );
  assert.match(error, /^pg_dump: €+$/);
  assert.ok(error.length > 100);
});

test("si la subida falla, anota la copia fallida con su error, avisa «fail» al monitor y sale con 1", () => {
  const { status, calls } = run({
    env: { FAIL_CMD: "rclone", FAIL_ARG: "copyto", FAIL_MESSAGE: "sin conexión con R2" },
  });
  assert.equal(status, 1);
  assert.deepEqual(names(calls), ["pg_dump", "pg_restore --file=/dev/null", "rclone copyto", "psql", "curl"]);
  assert.equal(psqlVar(calls[3], "ok"), "false");
  assert.match(psqlVar(calls[3], "error"), /^rclone copyto: sin conexión con R2/);
  assert.equal(calls[4].at(-1), "https://hc-ping.invalid/latido/fail");
});

test("un error con comillas llega entero a psql como variable, sin tocar el SQL", () => {
  const message = `pg_dump: error: can't connect; "db" O'Brien`;
  const { status, calls } = run({ env: { FAIL_CMD: "pg_dump", FAIL_MESSAGE: message } });
  assert.equal(status, 1);
  const psql = calls.find(([name]) => name === "psql");
  assert.equal(psqlVar(psql, "error"), `pg_dump: ${message}`);
  assert.ok(psql.some((line) => line.includes(":'error'")));
  assert.ok(!psql.some((line) => line.includes("O'Brien") && line.includes("record_backup")));
});

test("sin DATABASE_URL lo dice, sale con 1 y no corre nada", () => {
  const { status, calls, stderr } = run({
    envFile: "PGPASSWORD=clave-falsa\nRCLONE_REMOTE=r2:donpipos-prueba\nHEARTBEAT_URL=https://hc-ping.invalid/latido\n",
  });
  assert.equal(status, 1);
  assert.match(stderr, /Falta DATABASE_URL/);
  assert.deepEqual(calls, []);
});

test("la copia queda solo para root, y la contraseña de la base viaja por el entorno, nunca en la línea de comandos", () => {
  const { status, calls, dir, stderr } = run();
  assert.equal(status, 0, stderr);
  const backups = join(dir, "backups");
  const [dump] = readdirSync(backups);
  assert.equal(statSync(backups).mode & 0o777, 0o700);
  assert.equal(statSync(join(backups, dump)).mode & 0o777, 0o600);
  for (const call of calls) {
    const forTheDatabase = ["pg_dump", "psql"].includes(call[0]);
    assert.equal(
      call.includes("(PGPASSWORD en el entorno)"),
      forTheDatabase,
      `${call[0]}: la contraseña, solo si es de la base`,
    );
    assert.ok(!call.some((line) => line.includes("clave-falsa")), `${call[0]} no la ve en sus argumentos`);
  }
});

test("una DATABASE_URL con la contraseña adentro no corre: la contraseña va en PGPASSWORD", () => {
  const { status, calls, stderr } = run({
    envFile:
      "DATABASE_URL=postgresql://postgres:clave-falsa@db.invalid:5432/postgres\nRCLONE_REMOTE=r2:x\nHEARTBEAT_URL=https://hc-ping.invalid/latido\n",
  });
  assert.equal(status, 1);
  assert.match(stderr, /PGPASSWORD/);
  assert.deepEqual(calls, []);
});
