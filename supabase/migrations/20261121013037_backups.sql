-- La copia de seguridad (docs/spec/businesses.md, fase 8). Cada copia la anota el script del VPS al terminar, con la misma
-- conexión a la base que usa pg_dump: así el VPS no guarda otro secreto. La app ve solo cuándo terminó la última buena y
-- si está atrasada; nada más de la tabla. La copia es de toda la base: no lleva business_id
create table private.backup_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  ok boolean not null,
  size_bytes bigint constraint backup_runs_size_bytes_min check (size_bytes >= 0),
  error text,
  created_at timestamptz not null default now(),
  constraint backup_runs_failed_has_error check (ok or error is not null),
  constraint backup_runs_finished_after_start check (finished_at >= started_at)
);

-- La última copia buena
create index backup_runs_last_ok_idx on private.backup_runs (finished_at desc) where ok;

alter table private.backup_runs enable row level security;

-- La llama el script del VPS (scripts/backup/donpipos-backup.sh) al terminar cada copia, buena o fallida
create function private.record_backup(
  p_started_at timestamptz, p_finished_at timestamptz, p_ok boolean, p_size_bytes bigint, p_error text
) returns void
language sql
set search_path = ''
as $$
  insert into private.backup_runs (started_at, finished_at, ok, size_bytes, error)
  values (p_started_at, p_finished_at, p_ok, p_size_bytes, left(p_error, 1000));
$$;

-- Para Ajustes: cuándo terminó la última copia buena y si está atrasada (ninguna, o más de 26 horas)
create function private.backup_status() returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lastBackupAt', private.iso_time(last.finished_at),
    'late', last.finished_at is null or last.finished_at < now() - interval '26 hours'
  )
  from (select max(r.finished_at) as finished_at from private.backup_runs r where r.ok) as last;
$$;

create function public.backup_status() returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.backup_status();
$$;

grant execute on function public.backup_status(), private.backup_status() to authenticated;
