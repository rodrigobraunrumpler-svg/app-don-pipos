select plan(24);

select tests.make_user('00000000-0000-4000-8000-00000000000a');
select tests.make_user('00000000-0000-4000-8000-00000000000b');
select tests.make_user('00000000-0000-4000-8000-00000000000c');
insert into public.businesses (id, owner_id, name, modules) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'Don Pipos (DEMO)', '{orders,stock}'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'Otro negocio (DEMO)', '{}');

-- Al crear un negocio
select results_eq(
  $$select active_payment_methods::text[], delivery_fee_cents::integer, delivery_zone, production_interval_days, lapsed_after_days, reminders, version
    from public.business_settings where business_id = '00000000-0000-4000-8000-0000000000a1'$$,
  $$values (array['cash', 'yape', 'plin', 'transfer'], 0, null::text, 7, 30, '{"scheduled": true, "stock": true, "balances": true}'::jsonb, 1)$$,
  'un negocio nuevo nace con sus ajustes por defecto');
select is((select next_order_number from private.business_counters where business_id = '00000000-0000-4000-8000-0000000000a1'), 1, 'y su contador empieza en 1');

-- El dueño A
select tests.login_as('00000000-0000-4000-8000-00000000000a');
select is(private.owned_business_ids(), array['00000000-0000-4000-8000-0000000000a1']::uuid[], 'A es dueño solo de su negocio');
select results_eq('select id from public.businesses', $$values ('00000000-0000-4000-8000-0000000000a1'::uuid)$$, 'A lee solo su negocio');
select results_eq('select business_id from public.business_settings', $$values ('00000000-0000-4000-8000-0000000000a1'::uuid)$$, 'y solo sus ajustes');
select throws_ok($$insert into public.businesses (owner_id, name) values ('00000000-0000-4000-8000-00000000000a', 'Otro')$$, '42501', null, 'A no crea negocios');
select throws_ok($$update public.business_settings set delivery_fee_cents = 500$$, '42501', null, 'A no cambia los ajustes directo');
select throws_ok($$delete from public.businesses$$, '42501', null, 'A no borra negocios');
select throws_ok($$select * from private.business_counters$$, '42501', null, 'A no lee el contador');
select throws_ok($$select private.current_business_id()$$, '42501', null, 'ni llama a las funciones internas');
select tests.logout();

-- C, sin negocio
select tests.login_as('00000000-0000-4000-8000-00000000000c');
select is(private.owned_business_ids(), '{}'::uuid[], 'C no es dueño de nada');
select is_empty('select id from public.businesses', 'C no ve ningún negocio');
select is_empty('select business_id from public.business_settings', 'ni ningún ajuste');
select tests.logout();

-- Sin sesión
select tests.login_as_anon();
select throws_ok('select id from public.businesses', '42501', null, 'sin sesión no se lee nada');
select tests.logout();

-- Las reglas de las tablas
select throws_ok($$insert into public.businesses (owner_id, name) values ('00000000-0000-4000-8000-00000000000a', '   ')$$, '23514', null, 'un negocio necesita nombre');
select throws_ok($$update public.businesses set modules = '{ventas}' where id = '00000000-0000-4000-8000-0000000000a1'$$, '23514', null, 'un módulo desconocido no entra');
select throws_ok($$update public.business_settings set production_interval_days = 0$$, '23514', null, 'producir cada 0 días no vale');
select throws_ok($$update public.business_settings set production_interval_days = 15$$, '23514', null, 'ni cada 15');
select throws_ok($$update public.business_settings set lapsed_after_days = 6$$, '23514', null, '«no vuelve» a los 6 días no vale');
select throws_ok($$update public.business_settings set lapsed_after_days = 121$$, '23514', null, 'ni a los 121');
select throws_ok($$update public.business_settings set active_payment_methods = '{}'$$, '23514', null, 'tiene que quedar un medio de pago');
select throws_ok($$update public.business_settings set reminders = '{"scheduled": true}'$$, '23514', null, 'los recordatorios llevan sus tres claves');

-- updated_at
update public.business_settings set delivery_zone = 'Centro', updated_at = '2020-01-01' where business_id = '00000000-0000-4000-8000-0000000000a1';
select ok((select updated_at > '2020-01-02' from public.business_settings where business_id = '00000000-0000-4000-8000-0000000000a1'), 'updated_at lo pone la base, no quien escribe');
select is((select count(*)::integer from public.business_settings where business_id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1')), 2, 'cada negocio tiene una sola fila de ajustes');

select * from finish();
