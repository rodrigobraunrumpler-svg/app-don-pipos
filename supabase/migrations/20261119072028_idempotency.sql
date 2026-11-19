-- Idempotencia: que un reintento con mala señal no cree nada dos veces.
-- Cada función que crea algo pide su clave al empezar (claim_request) y guarda su respuesta al terminar
-- (complete_request), todo dentro de la misma operación.

create extension if not exists pg_cron;

-- business_id no lleva llave foránea a propósito: la tabla es interna y efímera, solo la escriben
-- funciones que ya comprobaron el negocio, y así la prueba con dos conexiones corre sin guardar datos.
create table private.idempotency_keys (
  business_id uuid not null,
  request_id uuid not null,
  function_name text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (business_id, request_id)
);

-- Para la limpieza diaria
create index idempotency_keys_created_at_idx on private.idempotency_keys (created_at);

alter table private.idempotency_keys enable row level security;

-- Insertar primero es lo que protege: si dos reintentos llegan a la vez, el segundo espera en la llave
-- hasta que el primero termina. Devuelve null si la clave es nueva; si no, la respuesta ya guardada.
create function private.claim_request(p_business_id uuid, p_request_id uuid, p_function text) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_key private.idempotency_keys%rowtype;
begin
  if p_request_id is null then
    perform private.fail('invalid');
  end if;

  insert into private.idempotency_keys (business_id, request_id, function_name)
  values (p_business_id, p_request_id, p_function)
  on conflict (business_id, request_id) do nothing;
  if found then
    return null;
  end if;

  select k.* into v_key
  from private.idempotency_keys k
  where k.business_id = p_business_id and k.request_id = p_request_id;

  -- El mismo código para otra función, o una clave que quedó sin respuesta: no se crea nada más
  if v_key.function_name <> p_function or v_key.response is null then
    perform private.fail('conflict');
  end if;
  return v_key.response;
end;
$$;

create function private.complete_request(p_business_id uuid, p_request_id uuid, p_response jsonb) returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if p_response is null then
    raise exception 'complete_request necesita la respuesta' using errcode = 'XX000';
  end if;

  update private.idempotency_keys k
  set response = p_response
  where k.business_id = p_business_id and k.request_id = p_request_id;
  if not found then
    raise exception 'complete_request sin claim_request antes' using errcode = 'XX000';
  end if;
  return p_response;
end;
$$;

create function private.purge_idempotency_keys() returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from private.idempotency_keys k where k.created_at < now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Cada día a las 08:15 UTC, que son las 03:15 de Lima
select cron.schedule('purge-idempotency-keys', '15 8 * * *', 'select private.purge_idempotency_keys()');
