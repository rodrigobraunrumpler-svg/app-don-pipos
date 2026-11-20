-- Editar un pedido antes de entregarlo (precios del momento para lo que estaba, de hoy para lo nuevo, stock con la
-- diferencia, devolución si baja de lo pagado) y su «Deshacer»
select plan(24);

select tests.make_user('00000000-0000-4000-8000-0000000009c1');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009d1', '00000000-0000-4000-8000-0000000009c1', 'Negocio A (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}', delivery_fee_cents = 0
where business_id = '00000000-0000-4000-8000-0000000009d1';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-0000000009d1', 'Coqueta', 1200, 2),
  ('00000000-0000-4000-8000-000000000b02', '00000000-0000-4000-8000-0000000009d1', 'Morenita', 1200, 2),
  ('00000000-0000-4000-8000-000000000b03', '00000000-0000-4000-8000-0000000009d1', 'Pipo Crush', 1300, 2);

create function pg_temp.draft(p_lines jsonb, p_changes jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('customer', jsonb_build_object('phone', '+51900000991', 'name', 'Ana (DEMO)'),
    'fulfillment', 'pickup', 'lines', p_lines) || p_changes;
$$;
create function pg_temp.line(p_product text, p_quantity integer) returns jsonb language sql as $$
  select jsonb_build_object('productId', ('00000000-0000-4000-8000-000000000' || p_product)::uuid, 'quantity', p_quantity);
$$;
create function pg_temp.on_hand(p_product text) returns integer language sql as $$
  select l.on_hand from public.stock_levels l where l.product_id = ('00000000-0000-4000-8000-000000000' || p_product)::uuid;
$$;
grant execute on function pg_temp.draft(jsonb, jsonb), pg_temp.line(text, integer), pg_temp.on_hand(text) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000009c1');
select public.register_production(gen_random_uuid(), jsonb_build_array(pg_temp.line('b01', 20), pg_temp.line('b02', 20)));
-- El pedido: 2 Coquetas a S/ 12, con S/ 20 pagados por Yape
select set_config('t.o', public.create_order(gen_random_uuid(),
  pg_temp.draft(jsonb_build_array(pg_temp.line('b01', 2)), '{"payment": {"method": "yape", "amountCents": 2000}}')) ->> 'id', true);
select tests.logout();
update public.products set price_cents = 1300 where name = 'Coqueta';
update public.products set price_cents = 1500 where name = 'Morenita';
select tests.login_as('00000000-0000-4000-8000-0000000009c1');

-- Editar: 3 Coquetas y 1 Morenita
select set_config('t.e1', public.edit_order('00000000-0000-4000-8000-00000000e401', current_setting('t.o')::uuid, 1,
  jsonb_build_array(pg_temp.line('b01', 3), pg_temp.line('b02', 1)), null, null)::text, true);
select is(current_setting('t.e1')::jsonb -> 'lines', jsonb_build_array(
  jsonb_build_object('productId', '00000000-0000-4000-8000-000000000b01', 'productName', 'Coqueta', 'quantity', 3, 'unitPriceCents', 1200),
  jsonb_build_object('productId', '00000000-0000-4000-8000-000000000b02', 'productName', 'Morenita', 'quantity', 1, 'unitPriceCents', 1500)),
  'lo que estaba conserva su precio y lo nuevo va al precio de hoy');
select is((current_setting('t.e1')::jsonb ->> 'totalCents')::integer, 5100, 'el total se rehace');
select is(current_setting('t.e1')::jsonb ->> 'itemsSummary', '3 Coquetas, 1 Morenita', 'y el resumen');
select is((current_setting('t.e1')::jsonb ->> 'version')::integer, 2, 'la versión sube');
select is(array[pg_temp.on_hand('b01'), pg_temp.on_hand('b02')], array[17, 19], 'el stock se mueve con la diferencia');
select is((public.edit_order('00000000-0000-4000-8000-00000000e401', current_setting('t.o')::uuid, 1,
  jsonb_build_array(pg_temp.line('b01', 3), pg_temp.line('b02', 1)), null, null) ->> 'version')::integer, 2,
  'el mismo código dos veces edita una vez');
select throws_ok(format('select public.edit_order(gen_random_uuid(), %L, 1, %L, null, null)', current_setting('t.o'),
  jsonb_build_array(pg_temp.line('b01', 4))), 'P0001', 'conflict', 'con una versión vieja, conflicto');

-- Por debajo de lo pagado (S/ 20): la devolución de la diferencia exacta
select throws_ok(format('select public.edit_order(gen_random_uuid(), %L, 2, %L, null, null)', current_setting('t.o'),
  jsonb_build_array(pg_temp.line('b01', 1))), 'P0001', 'invalid', 'sin devolver la diferencia no se guarda');
select throws_ok(format('select public.edit_order(gen_random_uuid(), %L, 2, %L, 500, %L)', current_setting('t.o'),
  jsonb_build_array(pg_temp.line('b01', 1)), 'cash'), 'P0001', 'invalid', 'ni devolviendo otra cantidad');
select set_config('t.e2', public.edit_order(gen_random_uuid(), current_setting('t.o')::uuid, 2,
  jsonb_build_array(pg_temp.line('b01', 1)), 800, 'cash')::text, true);
select is((current_setting('t.e2')::jsonb ->> 'paidCents')::integer, 1200, 'con la devolución exacta, lo pagado queda en el total nuevo');
select is((select count(*)::integer from public.payments p where p.order_id = current_setting('t.o')::uuid
  and p.kind = 'refund' and p.amount_cents = 800 and p.method = 'cash' and p.voided_at is null), 1, 'y la devolución queda anotada');
select throws_ok(format('select public.edit_order(gen_random_uuid(), %L, 3, %L, 100, %L)', current_setting('t.o'),
  jsonb_build_array(pg_temp.line('b01', 2)), 'cash'), 'P0001', 'invalid', 'una devolución que no hace falta tampoco');

-- Deshacer la edición: las líneas de antes, el stock y la devolución anulada
select set_config('t.r', public.revert_edit(current_setting('t.o')::uuid, 3)::text, true);
select is((current_setting('t.r')::jsonb ->> 'totalCents')::integer, 5100, 'deshacer vuelve a las líneas de antes');
select is((current_setting('t.r')::jsonb ->> 'paidCents')::integer, 2000, 'y a lo pagado');
select is((select p.void_reason from public.payments p where p.order_id = current_setting('t.o')::uuid and p.kind = 'refund'),
  'Deshacer edición', 'anula la devolución de esa edición');
select is(array[pg_temp.on_hand('b01'), pg_temp.on_hand('b02')], array[17, 19], 'y el stock vuelve');
select throws_ok(format('select public.revert_edit(%L, 3)', current_setting('t.o')), 'P0001', 'conflict', 'el segundo «Deshacer»: conflicto');

-- Pasados 10 minutos ya no se deshace
select public.edit_order(gen_random_uuid(), current_setting('t.o')::uuid, 4, jsonb_build_array(pg_temp.line('b01', 4)), null, null);
select tests.logout();
update private.audit_log set changed_at = changed_at - interval '11 minutes' where row_id = current_setting('t.o')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009c1');
select throws_ok(format('select public.revert_edit(%L, 5)', current_setting('t.o')), 'P0001', 'invalid', 'pasados 10 minutos, no');

-- Editar, avanzar y deshacer la edición: ya no es lo último
select set_config('t.o2', public.create_order(gen_random_uuid(), pg_temp.draft(jsonb_build_array(pg_temp.line('b01', 1)))) ->> 'id', true);
select public.edit_order(gen_random_uuid(), current_setting('t.o2')::uuid, 1, jsonb_build_array(pg_temp.line('b01', 2)), null, null);
select public.advance_order(current_setting('t.o2')::uuid, 'new');
select throws_ok(format('select public.revert_edit(%L, 2)', current_setting('t.o2')), 'P0001', 'conflict',
  'después de otro cambio, deshacer la edición es un conflicto');

-- Lo que no se edita
select throws_ok(format('select public.edit_order(gen_random_uuid(), %L, 3, %L, null, null)', current_setting('t.o2'),
  jsonb_build_array(pg_temp.line('b03', 0))), 'P0001', 'invalid', 'una línea sin cantidad válida se rechaza');
select tests.logout();
update public.products set is_active = false where name in ('Pipo Crush', 'Coqueta');
select tests.login_as('00000000-0000-4000-8000-0000000009c1');
select throws_ok(format('select public.edit_order(gen_random_uuid(), %L, 3, %L, null, null)', current_setting('t.o2'),
  jsonb_build_array(pg_temp.line('b01', 2), pg_temp.line('b03', 1))), 'P0001', 'not_found', 'un alfajor nuevo apagado no entra');
select is((public.edit_order(gen_random_uuid(), current_setting('t.o2')::uuid, 3,
  jsonb_build_array(pg_temp.line('b01', 3)), null, null) ->> 'totalCents')::integer, 3900,
  'uno que ya estaba sigue aunque se haya apagado, con su precio');
select public.advance_order(current_setting('t.o2')::uuid, 'preparing');
select public.advance_order(current_setting('t.o2')::uuid, 'ready');
select throws_ok(format('select public.edit_order(gen_random_uuid(), %L, 6, %L, null, null)', current_setting('t.o2'),
  jsonb_build_array(pg_temp.line('b01', 1))), 'P0001', 'invalid', 'uno entregado ya no se edita');

-- Los totales del cliente siguen a sus pedidos
select is((select c.spent_cents::integer from public.customers c where c.phone = '+51900000991'),
  (select sum(o.total_cents)::integer from public.orders o where o.customer_name = 'Ana (DEMO)' and o.status <> 'cancelled'),
  'lo gastado por el cliente sigue a sus pedidos editados');
select tests.logout();

select * from finish();
