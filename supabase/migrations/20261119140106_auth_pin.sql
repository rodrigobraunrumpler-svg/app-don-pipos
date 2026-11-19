-- El PIN del dueño y los intentos de ingreso (docs/spec/auth.md §2 y §3).
-- Todo vive en private: solo lo usan las funciones del servidor (Edge Functions) y los scripts del equipo.

create table private.pin_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone public.phone_pe not null constraint pin_credentials_phone_key unique,
  pin_hash text not null,
  pin_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Los intentos se cuentan por número, en su propia tabla: un número que no existe se comporta igual que uno que existe
create table private.sign_in_attempts (
  phone public.phone_pe primary key,
  failed_attempts integer not null default 0 constraint sign_in_attempts_failed_attempts_min check (failed_attempts >= 0),
  locked_until timestamptz,
  hard_locked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table private.pin_credentials enable row level security;
alter table private.sign_in_attempts enable row level security;

create trigger set_updated_at before update on private.pin_credentials
  for each row execute function private.set_updated_at();

-- Un PIN fácil de adivinar: seguidos hacia arriba o hacia abajo (sin dar la vuelta), una pareja repetida 3 veces,
-- un trío repetido 2 veces o los últimos 6 números del celular. Es la misma regla que pinIsObvious, en la app.
-- Lo que no son 6 números también cuenta como fácil: nunca se acepta como PIN.
create function private.pin_is_obvious(p_pin text, p_phone text) returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_up boolean := true;
  v_down boolean := true;
  v_step integer;
begin
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return true;
  end if;
  for v_index in 1..5 loop
    v_step := substr(p_pin, v_index + 1, 1)::integer - substr(p_pin, v_index, 1)::integer;
    v_up := v_up and v_step = 1;
    v_down := v_down and v_step = -1;
  end loop;
  return v_up
    or v_down
    or p_pin = repeat(left(p_pin, 2), 3)
    or p_pin = repeat(left(p_pin, 3), 2)
    or p_pin = right(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), 6);
end;
$$;

-- Para los scripts del equipo: guarda el PIN (bcrypt de costo 10) y desbloquea el número
create function private.set_pin(p_user_id uuid, p_phone text, p_pin text) returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_user_id is null or p_phone is null or p_phone !~ '^\+51[0-9]{9}$' or private.pin_is_obvious(p_pin, p_phone) then
    perform private.fail('invalid');
  end if;

  insert into private.pin_credentials (user_id, phone, pin_hash, pin_changed_at)
  values (p_user_id, p_phone, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), now())
  on conflict (user_id) do update
    set phone = excluded.phone, pin_hash = excluded.pin_hash, pin_changed_at = excluded.pin_changed_at;

  delete from private.sign_in_attempts a where a.phone = p_phone;
end;
$$;

-- Un intento con un PIN, en una sola operación y con la fila de intentos del número bloqueada.
-- Devuelve el estado; si acierta, también el id de la cuenta (lo usa check_pin, nunca sale tal cual).
create function private.attempt_pin(p_phone text, p_pin text) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_attempt private.sign_in_attempts%rowtype;
  v_credential private.pin_credentials%rowtype;
  v_matches boolean;
begin
  if p_phone is null or p_phone !~ '^\+51[0-9]{9}$' or p_pin is null or p_pin !~ '^[0-9]{6}$' then
    perform private.fail('invalid');
  end if;

  insert into private.sign_in_attempts (phone) values (p_phone) on conflict (phone) do nothing;
  select a.* into v_attempt from private.sign_in_attempts a where a.phone = p_phone for update;

  if v_attempt.hard_locked_at is not null then
    return jsonb_build_object('status', 'hard_locked');
  end if;
  if v_attempt.locked_until > now() then
    return jsonb_build_object('status', 'locked',
      'retryAt', to_char(v_attempt.locked_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end if;

  select c.* into v_credential from private.pin_credentials c where c.phone = p_phone;
  -- Sin PIN, se compara igual contra un hash de relleno (bcrypt de costo 10, de nadie): así tarda lo mismo
  v_matches := extensions.crypt(p_pin, coalesce(v_credential.pin_hash, '$2a$10$7gazuQU/rmh/qeDeRQt07Orhlqjpx0MfW1MlaYrX7KcVEvPw05oPS'))
    = v_credential.pin_hash;

  if coalesce(v_matches, false) then
    update private.sign_in_attempts a set failed_attempts = 0, locked_until = null, updated_at = now() where a.phone = p_phone;
    return jsonb_build_object('status', 'ok', 'userId', v_credential.user_id);
  end if;

  update private.sign_in_attempts a
  set failed_attempts = a.failed_attempts + 1,
      locked_until = case when a.failed_attempts + 1 = 5 then now() + interval '15 minutes' else a.locked_until end,
      hard_locked_at = case when a.failed_attempts + 1 >= 10 then now() end,
      updated_at = now()
  where a.phone = p_phone
  returning a.* into v_attempt;

  if v_attempt.hard_locked_at is not null then
    return jsonb_build_object('status', 'hard_locked');
  end if;
  if v_attempt.failed_attempts = 5 then
    return jsonb_build_object('status', 'locked',
      'retryAt', to_char(v_attempt.locked_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end if;
  return jsonb_build_object('status', 'wrong_pin', 'attemptsLeft',
    case when v_attempt.failed_attempts < 5 then 5 - v_attempt.failed_attempts else 10 - v_attempt.failed_attempts end);
end;
$$;

-- Para la función sign-in-with-pin: el intento, y si acierta, el correo de la cuenta para abrir la sesión
create function private.check_pin(p_phone text, p_pin text) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_result jsonb := private.attempt_pin(p_phone, p_pin);
begin
  if v_result ->> 'status' <> 'ok' then
    return v_result;
  end if;
  return v_result || jsonb_build_object('email', (select u.email from auth.users u where u.id = (v_result ->> 'userId')::uuid));
end;
$$;

-- Para la función change-pin: el PIN actual cuenta como intento; el nuevo no puede ser el mismo ni uno fácil
create function private.change_pin(p_user_id uuid, p_current text, p_next text) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_phone text;
  v_result jsonb;
begin
  select c.phone into v_phone from private.pin_credentials c where c.user_id = p_user_id;
  if v_phone is null then
    perform private.fail('not_found');
  end if;

  v_result := private.attempt_pin(v_phone, p_current);
  if v_result ->> 'status' <> 'ok' then
    return v_result;
  end if;
  if p_next = p_current then
    return jsonb_build_object('status', 'same_pin');
  end if;
  if private.pin_is_obvious(p_next, v_phone) then
    return jsonb_build_object('status', 'obvious_pin');
  end if;

  perform private.set_pin(p_user_id, v_phone, p_next);
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Son números que alguien escribió: no se guardan para siempre (Ley 29733). Se quedan los bloqueos de una cuenta real.
create function private.purge_sign_in_attempts() returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from private.sign_in_attempts a
  where a.updated_at < now() - interval '30 days'
    and (a.hard_locked_at is null or not exists (select 1 from private.pin_credentials c where c.phone = a.phone));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Cada día a las 08:20 UTC, que son las 03:20 de Lima
select cron.schedule('purge-sign-in-attempts', '20 8 * * *', 'select private.purge_sign_in_attempts()');
