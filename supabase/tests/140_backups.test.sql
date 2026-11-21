-- La copia de seguridad (docs/spec/businesses.md): la anota el script del VPS con su conexión a la base, y la app ve solo
-- cuándo fue la última buena y si está atrasada (más de 26 horas)
select plan(12);

select tests.make_user('00000000-0000-4000-8000-0000000014c1');

-- 1. Sin copias: sin hora
select tests.login_as('00000000-0000-4000-8000-0000000014c1');
select is(public.backup_status(), '{"lastBackupAt": null, "late": true}'::jsonb, 'sin copias, no hay hora');
select tests.logout();

-- 2. El script anota una buena y una fallida; las que no tienen sentido no entran
select lives_ok($$select private.record_backup(now() - interval '27 hours 5 minutes', now() - interval '27 hours', true, 1048576, null)$$, 'anota una copia buena');
select lives_ok($$select private.record_backup(now() - interval '2 hours 5 minutes', now() - interval '2 hours', false, null, 'rclone: sin conexión')$$, 'anota una fallida con su error');
select throws_ok($$select private.record_backup(now(), now(), false, null, null)$$, '23514', null, 'una fallida sin su error no entra');
select throws_ok($$select private.record_backup(now(), now() - interval '1 minute', true, 10, null)$$, '23514', null, 'una que termina antes de empezar no entra');

-- 3. La última buena tiene 27 horas: atrasada (la fallida de hace 2 horas no cuenta)
select tests.login_as('00000000-0000-4000-8000-0000000014c1');
select is((public.backup_status() ->> 'late')::boolean, true, 'con 27 horas, atrasada');
select tests.logout();

-- 4. Una buena de hace 3 horas: al día
select lives_ok($$select private.record_backup(now() - interval '3 hours 5 minutes', now() - interval '3 hours', true, 2097152, null)$$, 'anota otra buena');
select tests.login_as('00000000-0000-4000-8000-0000000014c1');
select is((public.backup_status() ->> 'late')::boolean, false, 'con 3 horas, al día');
select is((public.backup_status() ->> 'lastBackupAt')::timestamptz, date_trunc('milliseconds', now() - interval '3 hours'), 'con la hora en que terminó (en milisegundos)');

-- 5. La app no lee las copias ni las anota, y sin sesión no ve el estado
select throws_ok($$select count(*) from private.backup_runs$$, '42501', null, 'la app no lee las copias');
select throws_ok($$select private.record_backup(now(), now(), true, 1, null)$$, '42501', null, 'la app no anota copias');
select tests.login_as_anon();
select throws_ok($$select public.backup_status()$$, '42501', null, 'sin sesión no ve el estado');
