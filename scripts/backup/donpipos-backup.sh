#!/usr/bin/env bash
# La copia de seguridad diaria de la base de Don Pipos, desde el VPS (docs/plan/fase-8-entrega.md, tarea 3).
#
# Copia toda la base con pg_dump, revisa que el archivo se pueda leer, lo sube a Cloudflare R2 con rclone, borra lo
# viejo, lo anota en la base (Ajustes muestra la última copia buena) y avisa a un monitor de latidos. Si un paso falla,
# anota la copia fallida con su error, avisa «fail» al monitor y sale con 1: el monitor le escribe al equipo.
#
# Lee /etc/donpipos-backup.env (o BACKUP_ENV_FILE), que solo puede leer root:
#   DATABASE_URL    la conexión a la base (la de «Session pooler» del panel de Supabase), sin la contraseña
#   PGPASSWORD      la contraseña de la base: viaja por el entorno, nunca en la línea de comandos (se vería en `ps`)
#   RCLONE_REMOTE   adónde subir, por ejemplo r2:donpipos-backups
#   HEARTBEAT_URL   el latido del monitor (healthchecks.io: …/<uuid>; con «/fail» avisa que falló)
#   KEEP_DAYS       cuántos días se guardan en R2 (30)
#   BACKUP_DIR      dónde queda la copia en el VPS (/var/backups/donpipos; se guardan 3 días)
# Las pruebas cambian los programas con PG_DUMP, PG_RESTORE, PSQL, RCLONE y CURL.
set -euo pipefail
# Las copias tienen los datos de los clientes y los hash de los PIN: solo root las lee (la web corre en el mismo VPS)
umask 077

ENV_FILE="${BACKUP_ENV_FILE:-/etc/donpipos-backup.env}"
if [ -r "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi
for name in DATABASE_URL PGPASSWORD RCLONE_REMOTE HEARTBEAT_URL; do
  if [ -z "${!name:-}" ]; then
    echo "Falta $name en $ENV_FILE" >&2
    exit 1
  fi
done
if [[ "$DATABASE_URL" =~ ://[^/@]*:[^/@]*@ ]]; then
  echo "DATABASE_URL lleva la contraseña: sácala de ahí y ponla en PGPASSWORD, en $ENV_FILE" >&2
  exit 1
fi

PG_DUMP="${PG_DUMP:-pg_dump}"
PG_RESTORE="${PG_RESTORE:-pg_restore}"
PSQL="${PSQL:-psql}"
RCLONE="${RCLONE:-rclone}"
CURL="${CURL:-curl}"
KEEP_DAYS="${KEEP_DAYS:-30}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/donpipos}"

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
started_at="$(now)"
file="$BACKUP_DIR/donpipos-$(date -u +%Y%m%d-%H%M%S).dump"
step="preparar"

# Anota la copia en la base. Los valores van como variables de psql (:'…'), nunca dentro del SQL: un error con comillas
# no lo rompe. psql solo reemplaza variables en lo que lee por su entrada, no con -c
record() {
  PGPASSWORD="$PGPASSWORD" "$PSQL" "$DATABASE_URL" --no-psqlrc --quiet --set ON_ERROR_STOP=1 \
    -v started="$started_at" -v finished="$(now)" -v ok="$1" -v size="$2" -v error="$3" <<'SQL'
select private.record_backup(:'started'::timestamptz, :'finished'::timestamptz, :'ok'::boolean,
  nullif(:'size', '')::bigint, nullif(:'error', ''));
SQL
}

fail() {
  echo "La copia falló en «$step»: $1" >&2
  record false "" "$step: $1" >/dev/null 2>&1 || echo "Tampoco se pudo anotar la falla en la base" >&2
  "$CURL" -fsS -m 10 --retry 3 "$HEARTBEAT_URL/fail" >/dev/null 2>&1 || true
  exit 1
}

# La contraseña de la base solo para sus programas (pg_dump y psql), por el entorno de ese programa y nada más
db() { PGPASSWORD="$PGPASSWORD" "$@"; }

# Corre un paso; si falla, la copia falla con lo último que dijo el programa
run() {
  local output
  if ! output="$("$@" 2>&1)"; then
    fail "$(printf '%s' "$output" | tail -c 500)"
  fi
}

mkdir -p "$BACKUP_DIR"
step="pg_dump"
run db "$PG_DUMP" --format=custom --no-owner --no-privileges --file="$file" "$DATABASE_URL"
step="pg_restore"
run "$PG_RESTORE" --list "$file"
size="$(stat -c %s "$file")"
step="rclone copyto"
run "$RCLONE" copyto "$file" "$RCLONE_REMOTE/$(basename "$file")"
step="rclone delete"
run "$RCLONE" delete --min-age "${KEEP_DAYS}d" "$RCLONE_REMOTE"
find "$BACKUP_DIR" -name 'donpipos-*.dump' -mtime +3 -delete
step="anotar en la base"
run record true "$size" ""
if ! "$CURL" -fsS -m 10 --retry 3 "$HEARTBEAT_URL" >/dev/null; then
  echo "La copia quedó bien, pero no llegó el latido al monitor" >&2
  exit 1
fi
echo "Copia lista: $(basename "$file") ($size bytes)"
