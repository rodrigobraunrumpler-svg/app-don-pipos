-- Cimientos: permisos cerrados, el esquema private, los tipos comunes y lo que usan todas las tablas.
-- Las migraciones corren con el rol postgres; por eso los permisos por defecto se cierran para ese rol.

-- 1. Nada para anon ni para PUBLIC en el esquema public
revoke all on schema public from public, anon;
revoke all on all tables in schema public from public, anon, authenticated, service_role;
revoke all on all sequences in schema public from public, anon, authenticated, service_role;
revoke all on all functions in schema public from public, anon, authenticated, service_role;

-- 2. Lo que se cree después nace cerrado: cada permiso se da a mano, tabla por tabla y función por función.
--    El EXECUTE que Postgres regala a PUBLIC solo se puede quitar para todos los esquemas a la vez.
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres revoke execute on functions from public;

-- 3. Lo interno vive en private, un esquema que la API no expone
create schema private;
revoke all on schema private from public;

-- 4. Tipos que se repiten en varias tablas
create domain public.payment_method as text check (value in ('cash', 'yape', 'plin', 'transfer'));
create domain public.cents as integer check (value >= 0);
create domain public.positive_cents as integer check (value > 0);
create domain public.phone_pe as text check (value ~ '^\+51[0-9]{9}$');

-- 5. El trigger común de updated_at
create function private.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 6. Un solo modo de avisar un error a la app: P0001 con el código como mensaje
create function private.fail(p_code text) returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_code is null or p_code not in ('invalid', 'not_found', 'forbidden', 'conflict') then
    raise exception 'código de error desconocido: %', coalesce(p_code, 'null') using errcode = 'XX000';
  end if;
  raise exception using errcode = 'P0001', message = p_code;
end;
$$;
