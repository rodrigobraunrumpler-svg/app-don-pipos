select plan(27);

select tests.make_user('00000000-0000-4000-8000-00000000000a');
select tests.make_user('00000000-0000-4000-8000-00000000000b');
select tests.make_user('00000000-0000-4000-8000-00000000000c');
insert into public.businesses (id, owner_id, name, modules) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'Don Pipos (DEMO)', '{orders,stock}'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'Otro negocio (DEMO)', '{}');

select tests.login_as('00000000-0000-4000-8000-00000000000a');

select is(public.get_business(), '{
  "id": "00000000-0000-4000-8000-0000000000a1", "name": "Don Pipos (DEMO)", "modules": ["orders", "stock"], "setupDone": false,
  "settings": {"activePaymentMethods": ["cash", "yape", "plin", "transfer"], "deliveryFeeCents": 0, "deliveryZone": null,
    "productionIntervalDays": 7, "lapsedAfterDays": 30, "reminders": {"scheduled": true, "stock": true, "balances": true}, "version": 1}
}'::jsonb, 'get_business devuelve el negocio con sus ajustes');

select is(
  public.update_settings(1, '{"deliveryFeeCents": 500, "activePaymentMethods": ["cash", "yape"], "deliveryZone": "Centro de Huamanga", "productionIntervalDays": 3, "lapsedAfterDays": 45, "reminders": {"scheduled": false, "stock": true, "balances": true}}'),
  '{"activePaymentMethods": ["cash", "yape"], "deliveryFeeCents": 500, "deliveryZone": "Centro de Huamanga", "productionIntervalDays": 3, "lapsedAfterDays": 45, "reminders": {"scheduled": false, "stock": true, "balances": true}, "version": 2}'::jsonb,
  'update_settings cambia varios ajustes y sube la versión');
select is(public.get_business() -> 'settings' ->> 'deliveryFeeCents', '500', 'y get_business ya los muestra');
-- La app no lee el registro: se sale, se mira como postgres y se vuelve a entrar
select tests.logout();
select is((select changed_by from private.audit_log where business_id = '00000000-0000-4000-8000-0000000000a1' order by id desc limit 1), '00000000-0000-4000-8000-00000000000a'::uuid, 'el cambio queda en el registro con su autor');
select tests.login_as('00000000-0000-4000-8000-00000000000a');

select throws_ok($$select public.update_settings(1, '{"deliveryFeeCents": 700}')$$, 'P0001', 'conflict', 'con una versión vieja responde conflict');
select is(public.update_settings(2, '{"deliveryZone": ""}') ->> 'deliveryZone', null, 'una zona vacía se guarda como null');

-- Todo esto es invalid y no guarda nada (la versión sigue en 3)
select throws_ok($$select public.update_settings(3, '{}')$$, 'P0001', 'invalid', 'un cambio vacío');
select throws_ok($$select public.update_settings(3, '[]')$$, 'P0001', 'invalid', 'una lista en vez de un objeto');
select throws_ok($$select public.update_settings(3, null)$$, 'P0001', 'invalid', 'null');
select throws_ok($$select public.update_settings(3, '{"precio": 1}')$$, 'P0001', 'invalid', 'una clave desconocida');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": 500, "version": 9}')$$, 'P0001', 'invalid', 'una clave válida junto a una que no');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": -1}')$$, 'P0001', 'invalid', 'un delivery negativo');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": "500"}')$$, 'P0001', 'invalid', 'un texto donde va un número');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": 5.5}')$$, 'P0001', 'invalid', 'un número con decimales');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": null}')$$, 'P0001', 'invalid', 'null donde va un número');
select throws_ok($$select public.update_settings(3, '{"productionIntervalDays": 0}')$$, 'P0001', 'invalid', 'producir cada 0 días');
select throws_ok($$select public.update_settings(3, '{"productionIntervalDays": 15}')$$, 'P0001', 'invalid', 'producir cada 15 días');
select throws_ok($$select public.update_settings(3, '{"lapsedAfterDays": 6}')$$, 'P0001', 'invalid', '«no vuelve» a los 6 días');
select throws_ok($$select public.update_settings(3, '{"lapsedAfterDays": 121}')$$, 'P0001', 'invalid', '«no vuelve» a los 121 días');
select throws_ok($$select public.update_settings(3, '{"activePaymentMethods": []}')$$, 'P0001', 'invalid', 'quedarse sin medios de pago');
select throws_ok($$select public.update_settings(3, '{"activePaymentMethods": ["cash", "card"]}')$$, 'P0001', 'invalid', 'un medio de pago que no existe');
select throws_ok($$select public.update_settings(3, '{"activePaymentMethods": ["cash", "cash"]}')$$, 'P0001', 'invalid', 'un medio de pago repetido');
select throws_ok($$select public.update_settings(3, '{"reminders": {"scheduled": true}}')$$, 'P0001', 'invalid', 'recordatorios a medias');
select throws_ok($$select public.update_settings(3, '{"deliveryZone": 5}')$$, 'P0001', 'invalid', 'una zona que no es texto');
select is(public.get_business() -> 'settings' ->> 'version', '3', 'después de todos los rechazos la versión no se movió');
select tests.logout();

select is((select delivery_fee_cents::integer from public.business_settings where business_id = '00000000-0000-4000-8000-0000000000b1'), 0, 'los ajustes del otro negocio no se tocaron');

select tests.login_as('00000000-0000-4000-8000-00000000000c');
select throws_ok('select public.get_business()', 'P0001', 'not_found', 'sin negocio, get_business responde not_found');
select tests.logout();

select * from finish();
