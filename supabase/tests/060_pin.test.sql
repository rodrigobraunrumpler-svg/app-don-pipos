-- El PIN y los intentos (docs/spec/auth.md §2 y §3). El dueño …000a tiene el número +51900000101; el +51900000199 no tiene PIN.
select plan(44);

select tests.make_user('00000000-0000-4000-8000-00000000000a');

-- 1. Guardar un PIN
select throws_ok($$select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', '123456')$$, 'P0001', 'invalid', 'set_pin rechaza un PIN fácil');
select throws_ok($$select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', '12345')$$, 'P0001', 'invalid', 'set_pin rechaza cinco números');
select throws_ok($$select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', 'abcdef')$$, 'P0001', 'invalid', 'set_pin rechaza letras');
select lives_ok($$select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', '197346')$$, 'set_pin guarda un PIN bueno');

-- 2. El PIN correcto
select is(private.check_pin('+51900000101', '197346') ->> 'status', 'ok', 'el PIN correcto entra');
select is(private.check_pin('+51900000101', '197346') ->> 'userId', '00000000-0000-4000-8000-00000000000a', 'y dice de quién es la cuenta');
select is(private.check_pin('+51900000101', '197346') ->> 'email', '00000000-0000-4000-8000-00000000000a@prueba.invalid', 'con el correo de la cuenta');

-- 3. Cuatro errores
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 4}'::jsonb, 'primer error: quedan 4');
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 3}'::jsonb, 'segundo error: quedan 3');
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 2}'::jsonb, 'tercer error: quedan 2');
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 1}'::jsonb, 'cuarto error: queda 1');

-- 4. El quinto da la espera
select is(private.check_pin('+51900000101', '000001') ->> 'status', 'locked', 'el quinto error da 15 minutos de espera');
select ok(
  (private.check_pin('+51900000101', '000001') ->> 'retryAt')::timestamptz between now() + interval '14 minutes' and now() + interval '16 minutes',
  'la espera termina en 15 minutos');

-- 5. Durante la espera
select is(private.check_pin('+51900000101', '197346') ->> 'status', 'locked', 'durante la espera ni el PIN correcto entra');

-- 6. Vencida la espera, cuatro errores más y el décimo bloquea la cuenta
update private.sign_in_attempts set locked_until = now() - interval '1 second' where phone = '+51900000101';
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 4}'::jsonb, 'después de la espera: quedan 4 hasta el bloqueo');
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 3}'::jsonb, 'quedan 3');
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 2}'::jsonb, 'quedan 2');
select is(private.check_pin('+51900000101', '000001'), '{"status": "wrong_pin", "attemptsLeft": 1}'::jsonb, 'queda 1');
select is(private.check_pin('+51900000101', '000001'), '{"status": "hard_locked"}'::jsonb, 'el décimo error bloquea la cuenta');

-- 7. Con la cuenta bloqueada
select is(private.check_pin('+51900000101', '197346'), '{"status": "hard_locked"}'::jsonb, 'bloqueada, ni el PIN correcto entra');

-- 8. El equipo pone el PIN otra vez y la cuenta se desbloquea
select lives_ok($$select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', '197346')$$, 'el equipo pone el PIN otra vez');
select is(private.check_pin('+51900000101', '197346') ->> 'status', 'ok', 'y la cuenta vuelve a entrar');

-- 9. Un acierto reinicia el contador
select is(private.check_pin('+51900000101', '000001') ->> 'attemptsLeft', '4', 'un error');
select is(private.check_pin('+51900000101', '197346') ->> 'status', 'ok', 'un acierto');
select is(private.check_pin('+51900000101', '000001') ->> 'attemptsLeft', '4', 'y el contador volvió a empezar');

-- 10. Ninguna respuesta lleva el hash
select ok(
  not exists (
    select 1 from unnest(array['197346', '000001']) as attempt(pin)
    where private.check_pin('+51900000101', attempt.pin)::text like '%$2%'
  ),
  'ninguna respuesta lleva el hash del PIN');

-- 11. Un número sin PIN responde, intento por intento, igual que uno con PIN
select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', '197346');
select is(
  array(select private.check_pin('+51900000199', '000001') from generate_series(1, 5) as n order by n),
  array(select private.check_pin('+51900000101', '000001') from generate_series(1, 5) as n order by n),
  'un número sin PIN responde igual que uno con PIN');

-- 12. Las reglas de los PIN fáciles: los mismos ejemplos que la regla del celular (src/features/auth/rules/pin.test.ts)
select is(
  array(select pin from unnest(array['123456', '654321', '012345', '987654', '111111', '121212', '123123', '000000', '000101']) as pin
        where not private.pin_is_obvious(pin, '+51900000101')),
  '{}'::text[], 'todos estos PIN son fáciles');
select is(
  array(select pin from unnest(array['197346', '582039', '901234', '120121']) as pin where private.pin_is_obvious(pin, '+51900000101')),
  '{}'::text[], 'ninguno de estos es fácil');

-- 13. Cambiar el PIN
select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', '197346');
select is(private.change_pin('00000000-0000-4000-8000-00000000000a', '000001', '582039'), '{"status": "wrong_pin", "attemptsLeft": 4}'::jsonb, 'con el PIN actual equivocado cuenta como intento');
select is(private.change_pin('00000000-0000-4000-8000-00000000000a', '197346', '197346'), '{"status": "same_pin"}'::jsonb, 'el PIN nuevo igual al actual no se acepta');
select is(private.change_pin('00000000-0000-4000-8000-00000000000a', '197346', '123456'), '{"status": "obvious_pin"}'::jsonb, 'un PIN nuevo fácil no se acepta');
select is(private.change_pin('00000000-0000-4000-8000-00000000000a', '197346', '582039'), '{"status": "ok"}'::jsonb, 'un PIN nuevo bueno se guarda');
select is(private.check_pin('+51900000101', '197346') ->> 'status', 'wrong_pin', 'el PIN anterior ya no entra');
select is(private.check_pin('+51900000101', '582039') ->> 'status', 'ok', 'el nuevo sí');
select throws_ok($$select private.change_pin('00000000-0000-4000-8000-0000000000ff', '197346', '582039')$$, 'P0001', 'not_found', 'sin PIN guardado responde not_found');

-- 14. La limpieza de cada noche
insert into private.sign_in_attempts (phone, failed_attempts, updated_at) values ('+51900000177', 2, now() - interval '31 days');
insert into private.sign_in_attempts (phone, failed_attempts, hard_locked_at, updated_at) values ('+51900000166', 10, now(), now() - interval '31 days');
update private.sign_in_attempts set failed_attempts = 10, hard_locked_at = now(), updated_at = now() - interval '31 days' where phone = '+51900000101';
select is(private.purge_sign_in_attempts(), 2, 'la limpieza borra las filas viejas de números sin PIN, también las bloqueadas');
select is((select count(*)::integer from private.sign_in_attempts where phone = '+51900000101'), 1, 'y deja la del número con PIN bloqueado');
select is((select schedule from cron.job where jobname = 'purge-sign-in-attempts'), '20 8 * * *', 'la limpieza corre cada noche a las 03:20 de Lima');

-- 15. La app no ve ni usa nada de esto
select tests.login_as('00000000-0000-4000-8000-00000000000a');
select throws_ok('select * from private.pin_credentials', '42501', null, 'la app no lee los PIN');
select throws_ok('select * from private.sign_in_attempts', '42501', null, 'ni los intentos');
select throws_ok($$select private.check_pin('+51900000101', '197346')$$, '42501', null, 'ni revisa un PIN');
select throws_ok($$select private.change_pin('00000000-0000-4000-8000-00000000000a', '197346', '582039')$$, '42501', null, 'ni lo cambia');
select throws_ok($$select private.set_pin('00000000-0000-4000-8000-00000000000a', '+51900000101', '582039')$$, '42501', null, 'ni lo pone');
select tests.logout();

select * from finish();
