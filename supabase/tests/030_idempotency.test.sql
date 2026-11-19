select plan(13);

select tests.make_user('00000000-0000-4000-8000-00000000000a');

select is(private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 'create_order'), null, 'la primera vez no hay nada guardado');
select is(private.complete_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', '{"id": "x"}'), '{"id": "x"}'::jsonb, 'guarda la respuesta y la devuelve');
select is(private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 'create_order'), '{"id": "x"}'::jsonb, 'el reintento recibe lo que ya se creó');
select is((select count(*)::integer from private.idempotency_keys), 1, 'y no se guarda una segunda clave');
select throws_ok($$select private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 'add_payment')$$, 'P0001', 'conflict', 'el mismo código en otra función es un conflicto');
select throws_ok($$select private.claim_request('00000000-0000-4000-8000-0000000000a1', null, 'create_order')$$, 'P0001', 'invalid', 'sin código no se acepta');
select is(private.claim_request('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000101', 'create_order'), null, 'otro negocio puede usar el mismo código');

-- Una clave que quedó sin respuesta sería un error de la función que la pidió: no se deja crear otra vez
insert into private.idempotency_keys (business_id, request_id, function_name) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000401', 'create_order');
select throws_ok($$select private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000401', 'create_order')$$, 'P0001', 'conflict', 'una clave sin respuesta guardada no deja crear otra vez');

insert into private.idempotency_keys (business_id, request_id, function_name, created_at) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000201', 'create_order', now() - interval '8 days'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000202', 'create_order', now() - interval '6 days');
select is(private.purge_idempotency_keys(), 1, 'la limpieza borra las claves de más de 7 días');
select is((select count(*)::integer from private.idempotency_keys where request_id = '00000000-0000-4000-8000-000000000202'), 1, 'y deja las recientes');
select is((select schedule from cron.job where jobname = 'purge-idempotency-keys'), '15 8 * * *', 'la limpieza corre cada día a las 03:15 de Lima');

select tests.login_as('00000000-0000-4000-8000-00000000000a');
select throws_ok('select * from private.idempotency_keys', '42501', null, 'la app no lee las claves');
select throws_ok($$select private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000301', 'create_order')$$, '42501', null, 'ni las crea por su cuenta');
select tests.logout();

select * from finish();
