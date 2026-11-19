-- Las funciones del stock: producción, merma, conteo, estados, deshacer e historial
select plan(58);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
select tests.make_user('00000000-0000-4000-8000-0000000009a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009a2', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents, min_stock, sanity_id, is_active, sort_order) values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-0000000009b1', 'Coqueta', 1200, 6, 'alfajor-coqueta', true, 1),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-0000000009b1', 'Morenita', 1200, 6, null, true, 2),
  ('00000000-0000-4000-8000-000000000a03', '00000000-0000-4000-8000-0000000009b1', 'Limon Kiss', 1200, 0, null, true, 3),
  ('00000000-0000-4000-8000-000000000a04', '00000000-0000-4000-8000-0000000009b1', 'Inactivo', 1200, 0, null, false, 4),
  ('00000000-0000-4000-8000-000000000a09', '00000000-0000-4000-8000-0000000009b2', 'De otro', 1200, 0, null, true, 1);

select tests.login_as('00000000-0000-4000-8000-0000000009a1');

-- Producción
select set_config('t.r1', gen_random_uuid()::text, true);
select set_config('t.p1', public.register_production(current_setting('t.r1')::uuid,
  '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 5}, {"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 10}]')::text, true);
select is((current_setting('t.p1')::jsonb ->> 'total')::integer, 15, 'la producción suma lo de cada alfajor');
select is(current_setting('t.p1')::jsonb -> 'items',
  '[{"productId": "00000000-0000-4000-8000-000000000a01", "onHand": 10}, {"productId": "00000000-0000-4000-8000-000000000a02", "onHand": 5}]'::jsonb,
  'y devuelve el stock nuevo de cada uno, ordenados');
select is(current_setting('t.p1')::jsonb -> 'backOnWeb', '[{"productId": "00000000-0000-4000-8000-000000000a01", "name": "Coqueta"}]'::jsonb,
  'Coqueta (enlazada) vuelve a la web; Morenita no está en la web');
select is(public.register_production(current_setting('t.r1')::uuid, '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 99}]'),
  current_setting('t.p1')::jsonb, 'el mismo código otra vez devuelve lo mismo, sin registrar de nuevo');
select is((select on_hand from public.stock_levels where product_id = '00000000-0000-4000-8000-000000000a01'), 10, 'y el stock no cambió');

select throws_ok($$select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 0}]')$$, 'P0001', 'invalid', 'una cantidad de 0');
select throws_ok($$select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 10001}]')$$, 'P0001', 'invalid', 'más de 10,000');
select throws_ok($$select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 1}, {"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 2}]')$$, 'P0001', 'invalid', 'un alfajor repetido');
select throws_ok($$select public.register_production(gen_random_uuid(), '[]')$$, 'P0001', 'invalid', 'una lista vacía');
select throws_ok($$select public.register_production(gen_random_uuid(), '{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 1}')$$, 'P0001', 'invalid', 'algo que no es una lista');
select throws_ok($$select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 1, "price": 5}]')$$, 'P0001', 'invalid', 'una clave de más');
select throws_ok($$select public.register_production(gen_random_uuid(), '[{"productId": "x", "quantity": 1}]')$$, 'P0001', 'invalid', 'un id que no es un id');
select throws_ok($$select public.register_production(null, '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 1}]')$$, 'P0001', 'invalid', 'sin código del registro');
select throws_ok($$select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a09", "quantity": 1}]')$$, 'P0001', 'not_found', 'un alfajor de otro negocio');
select throws_ok($$select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a04", "quantity": 1}]')$$, 'P0001', 'not_found', 'un alfajor desactivado');

-- Merma
select throws_ok($$select public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a02', 1, null)$$, 'P0001', 'invalid', 'una merma sin motivo');
select throws_ok($$select public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a02', 1, 'perdida')$$, 'P0001', 'invalid', 'con un motivo que no existe');
select throws_ok($$select public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a02', 0, 'broken')$$, 'P0001', 'invalid', 'de 0');
select throws_ok($$select public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a09', 1, 'broken')$$, 'P0001', 'not_found', 'de un alfajor de otro negocio');
select is(public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a02', 6, 'broken'),
  '{"productId": "00000000-0000-4000-8000-000000000a02", "onHand": -1, "outOnWeb": false}'::jsonb, 'con 5, una merma de 6 deja −1: avisa, no bloquea (D12)');
select set_config('t.w1', gen_random_uuid()::text, true);
select is(public.register_waste(current_setting('t.w1')::uuid, '00000000-0000-4000-8000-000000000a01', 9, 'gift') ->> 'onHand', '1', 'Coqueta de 10 a 1');
select is(public.register_waste(current_setting('t.w1')::uuid, '00000000-0000-4000-8000-000000000a01', 9, 'gift') ->> 'onHand', '1', 'el mismo código de merma no resta dos veces');
select is((public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a01', 1, 'other') ->> 'outOnWeb')::boolean, true, 'de 1 a 0: se agota en la web');
select is((public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a01', 2, 'broken') ->> 'outOnWeb')::boolean, false, 'de 0 a −2: ya estaba agotada');
select is(public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 5}]') -> 'backOnWeb' -> 0 ->> 'name', 'Coqueta', 'de −2 a 3: vuelve a la web');
select is((public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a01', 1, 'broken') ->> 'outOnWeb')::boolean, false, 'de 3 a 2: sigue disponible');
select is((public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a01', 3, 'expired') ->> 'outOnWeb')::boolean, true, 'de 2 a −1: se agota');
select tests.logout();
select is(
  (select array_agg((payload ->> 'isAvailable')::boolean order by id) from private.web_sync_outbox where product_id = '00000000-0000-4000-8000-000000000a01'),
  array[true, false, true, false], 'una fila para la web en cada cruce del cero, y ninguna si queda del mismo lado');
select is((select count(*)::integer from private.web_sync_outbox where business_id = '00000000-0000-4000-8000-0000000009b1' and product_id <> '00000000-0000-4000-8000-000000000a01'), 0, 'nada para lo que no está enlazado');
select tests.login_as('00000000-0000-4000-8000-0000000009a1');

-- Conteo (Limon Kiss, sin enlazar)
select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a03", "quantity": 11}]');
select is((public.register_stock_count(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a03", "counted": 11}]') ->> 'adjustments')::integer, 0, 'contar lo mismo no crea ajustes');
select set_config('t.c1', gen_random_uuid()::text, true);
select is(public.register_stock_count(current_setting('t.c1')::uuid, '[{"productId": "00000000-0000-4000-8000-000000000a03", "counted": 12}]') -> 'items',
  '[{"productId": "00000000-0000-4000-8000-000000000a03", "onHand": 12}]'::jsonb, 'contar 12 deja 12');
select results_eq(
  format($$select kind, quantity, reason from public.stock_movements where request_id = %L$$, current_setting('t.c1')),
  $$values ('adjustment', 1, 'count')$$, 'con un ajuste de +1, de motivo conteo');
select is(public.register_stock_count(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a03", "counted": 0}]') -> 'items' -> 0 ->> 'onHand', '0', 'contar 0 deja 0');
select throws_ok($$select public.register_stock_count(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a03", "counted": -1}]')$$, 'P0001', 'invalid', 'no se cuenta menos de 0');
select throws_ok($$select public.register_stock_count(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a03", "quantity": 1}]')$$, 'P0001', 'invalid', 'el conteo lleva «counted»');

-- Lo apartado: en la fase 4 sale de los pedidos. Aquí se reemplaza dentro de la prueba
select tests.logout();
insert into public.products (id, business_id, name, price_cents, min_stock, sort_order) values
  ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-0000000009b1', 'E check', 1200, 6, 11),
  ('00000000-0000-4000-8000-000000000b02', '00000000-0000-4000-8000-0000000009b1', 'E owed', 1200, 6, 12),
  ('00000000-0000-4000-8000-000000000b03', '00000000-0000-4000-8000-0000000009b1', 'E out', 1200, 6, 13),
  ('00000000-0000-4000-8000-000000000b04', '00000000-0000-4000-8000-0000000009b1', 'E low5', 1200, 6, 14),
  ('00000000-0000-4000-8000-000000000b05', '00000000-0000-4000-8000-0000000009b1', 'E low6', 1200, 6, 15),
  ('00000000-0000-4000-8000-000000000b06', '00000000-0000-4000-8000-0000000009b1', 'E ok7', 1200, 6, 16),
  ('00000000-0000-4000-8000-000000000b07', '00000000-0000-4000-8000-0000000009b1', 'E ok0', 1200, 0, 17);
insert into public.stock_levels (business_id, product_id, on_hand) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000b01', -2),
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000b02', -14),
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000b04', 5),
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000b05', 6),
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000b06', 7),
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000b07', 3);
create or replace function private.reserved_stock(p_business_id uuid) returns table (product_id uuid, reserved integer)
language sql stable set search_path = '' as $$
  select v.product_id, v.reserved from (values ('00000000-0000-4000-8000-000000000b02'::uuid, 24), ('00000000-0000-4000-8000-000000000a03'::uuid, 2)) as v (product_id, reserved);
$$;
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select is(
  (select jsonb_object_agg(e ->> 'name', e ->> 'state') from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' like 'E %'),
  '{"E check": "check", "E owed": "owed", "E out": "out", "E low5": "low", "E low6": "low", "E ok7": "ok", "E ok0": "ok"}'::jsonb,
  'los estados: en la nevera negativo, faltan para pedidos, agotado, en el mínimo o debajo, y alcanza');
select is(
  (select e - 'productId' from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'E owed'),
  '{"name": "E owed", "imageUrl": null, "linkedToWeb": false, "minStock": 6, "onHand": -14, "reserved": 24, "physical": 10, "state": "owed"}'::jsonb,
  'libre −14 con 24 apartados: 10 en la nevera, faltan para pedidos');
select is((select count(*)::integer from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'Inactivo'), 0, 'un desactivado no sale en el stock');
select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a03", "quantity": 11}]');
select is((public.register_stock_count(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a03", "counted": 13}]') ->> 'adjustments')::integer, 0,
  'con 11 libres y 2 apartados, contar 13 no infla el stock');

-- Deshacer (Morenita está en −1)
select set_config('t.r2', gen_random_uuid()::text, true);
select public.register_production(current_setting('t.r2')::uuid, '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 10}]');
select is(public.revert_stock_change(current_setting('t.r2')::uuid),
  '{"reverted": 1, "items": [{"productId": "00000000-0000-4000-8000-000000000a02", "onHand": -1}]}'::jsonb, 'deshacer la producción devuelve el stock');
select is((public.revert_stock_change(current_setting('t.r2')::uuid) ->> 'reverted')::integer, 0, 'deshacer otra vez no hace nada más');
select results_eq(
  format($$select kind, quantity, reason from public.stock_movements where reverts_movement_id in (select id from public.stock_movements where request_id = %L)$$, current_setting('t.r2')),
  $$values ('adjustment', -10, 'undo')$$, 'el contrario es un ajuste de motivo deshacer');
select throws_ok($$select public.revert_stock_change(gen_random_uuid())$$, 'P0001', 'not_found', 'un registro que no existe');
select throws_ok($$select public.revert_stock_change(null)$$, 'P0001', 'invalid', 'sin código');
select set_config('t.r3', gen_random_uuid()::text, true);
select public.register_production(current_setting('t.r3')::uuid, '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 4}]');
select tests.logout();
update public.stock_movements set created_at = now() - interval '11 minutes' where request_id = current_setting('t.r3')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select throws_ok(format('select public.revert_stock_change(%L)', current_setting('t.r3')), 'P0001', 'invalid', 'pasados 10 minutos ya no se deshace');
select set_config('t.r4', gen_random_uuid()::text, true);
select public.register_production(current_setting('t.r4')::uuid, '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 10}]');
select public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a02', 3, 'broken');
select is(public.revert_stock_change(current_setting('t.r4')::uuid) -> 'items' -> 0 ->> 'onHand', '0', 'deshacer una producción después de una merma: 3 + 10 − 3 − 10 = 0');
select is(
  (select on_hand from public.stock_levels where product_id = '00000000-0000-4000-8000-000000000a02'),
  (select sum(quantity)::integer from public.stock_movements where product_id = '00000000-0000-4000-8000-000000000a02'),
  'el stock sigue siendo la suma de los movimientos');
select set_config('t.c2', gen_random_uuid()::text, true);
select public.register_stock_count(current_setting('t.c2')::uuid, '[{"productId": "00000000-0000-4000-8000-000000000a02", "counted": 7}, {"productId": "00000000-0000-4000-8000-000000000a03", "counted": 1}]');
select is((public.revert_stock_change(current_setting('t.c2')::uuid) ->> 'reverted')::integer, 2, 'deshacer un conteo deshace todos sus ajustes');

-- Historial
select tests.logout();
insert into public.products (id, business_id, name, price_cents, sort_order) values
  ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-0000000009b1', 'Historial', 1200, 20);
insert into public.stock_movements (business_id, product_id, kind, quantity, happened_at)
select '00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000c01', 'production', n, timestamptz '2026-11-01 12:00:00+00' + n * interval '1 hour'
from generate_series(1, 25) as n;
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select set_config('t.h1', public.list_product_movements('00000000-0000-4000-8000-000000000c01')::text, true);
select is(jsonb_array_length(current_setting('t.h1')::jsonb -> 'items'), 20, 'la primera página trae 20');
select is((current_setting('t.h1')::jsonb -> 'meta') - 'nextCursor', '{"limit": 20, "total": 25, "hasMore": true}'::jsonb, 'dice cuántos hay y que hay más');
select is((current_setting('t.h1')::jsonb -> 'items' -> 0 ->> 'quantity')::integer, 25, 'del más nuevo al más viejo');
select set_config('t.h2', public.list_product_movements('00000000-0000-4000-8000-000000000c01', 20, current_setting('t.h1')::jsonb -> 'meta' ->> 'nextCursor')::text, true);
select is(
  (select array_agg((e ->> 'quantity')::integer) from jsonb_array_elements(current_setting('t.h2')::jsonb -> 'items') as e),
  array[5, 4, 3, 2, 1], 'la segunda, con su cursor, trae los 5 que faltan');
select is(current_setting('t.h2')::jsonb -> 'meta', '{"limit": 20, "total": 25, "hasMore": false, "nextCursor": null}'::jsonb, 'y ya no hay más');
select is(public.list_product_movements('00000000-0000-4000-8000-000000000c01', 100) -> 'meta' ->> 'limit', '50', 'el límite máximo es 50');
select throws_ok($$select public.list_product_movements('00000000-0000-4000-8000-000000000c01', 0)$$, 'P0001', 'invalid', 'un límite menor que 1');
select throws_ok($$select public.list_product_movements('00000000-0000-4000-8000-000000000c01', 20, 'zzz')$$, 'P0001', 'invalid', 'un cursor que no se puede leer');

-- Permisos
select throws_ok($$select private.move_stock('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000a01', 'production', 1, null, null, null)$$, '42501', null, 'la app no mueve el stock sin pasar por las funciones');
select tests.login_as('00000000-0000-4000-8000-0000000009a2');
select throws_ok($$select public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000a01', 1, 'broken')$$, 'P0001', 'not_found', 'otro dueño no toca mi stock');
select tests.logout();

select * from finish();
