-- Las esperas del PIN (decisión I3, fase 8): cada 5 errores seguidos hay una espera más larga (15 minutos, 1 hora y
-- después 24 horas) y ningún error bloquea la cuenta. Con el número del dueño, que es público, cualquiera podría dejarlo
-- sin entrar. El bloqueo que pone el equipo a mano (hard_locked_at) sigue bloqueando.
create or replace function private.attempt_pin(p_phone text, p_pin text) returns jsonb
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

  -- Cada 5 errores seguidos, una espera más larga: 15 minutos, 1 hora y después 24 horas
  update private.sign_in_attempts a
  set failed_attempts = a.failed_attempts + 1,
      locked_until = case
        when (a.failed_attempts + 1) % 5 <> 0 then a.locked_until
        when a.failed_attempts + 1 = 5 then now() + interval '15 minutes'
        when a.failed_attempts + 1 = 10 then now() + interval '1 hour'
        else now() + interval '24 hours'
      end,
      updated_at = now()
  where a.phone = p_phone
  returning a.* into v_attempt;

  if v_attempt.failed_attempts % 5 = 0 then
    return jsonb_build_object('status', 'locked',
      'retryAt', to_char(v_attempt.locked_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end if;
  return jsonb_build_object('status', 'wrong_pin', 'attemptsLeft', 5 - v_attempt.failed_attempts % 5);
end;
$$;
