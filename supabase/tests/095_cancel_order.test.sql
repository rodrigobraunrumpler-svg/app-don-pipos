-- Anular un pedido en cualquier estado (el stock vuelve, la devolución total o parcial queda como otra fila, los totales
-- del cliente bajan) y su «Deshacer»
select plan(24);

select tests.make_user('00000000-0000-4000-8000-0000000009c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009d2', '00000000-0000-4000-8000-0000000009c2', 'Negocio A (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}', delivery_fee_cents = 0
where business_id = '00000000-0000-4000-8000-0000000009d2';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-0000000009d2', 'Coqueta', 1200, 2);

create function pg_temp.draft(p_quantity integer, p_changes jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('customer', jsonb_build_object('phone', '+51900000992', 'name', 'Luis (DEMO)'), 'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-000000000c01', 'quantity', p_quantity))) || p_changes;
$$;
create function pg_temp.on_hand() returns integer language sql as $$
  select l.on_hand from public.stock_levels l where l.product_id = '00000000-0000-4000-8000-000000000c01';
$$;
create function pg_temp.customer() returns integer[] language sql as $$
  select array[c.orders_count, c.spent_cents::integer] from public.customers c where c.phone = '+51900000992';
$$;
grant execute on function pg_temp.draft(integer, jsonb), pg_temp.on_hand(), pg_temp.customer() to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000009c2');
select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000c01", "quantity": 30}]');

-- Uno nuevo, sin pagos (2 Coquetas): el stock vuelve, queda con su motivo y su evento
select set_config('t.a', public.create_order(gen_random_uuid(), pg_temp.draft(2)) ->> 'id', true);
select throws_ok(format('select public.cancel_order(gen_random_uuid(), %L, %L, null, null)', current_setting('t.a'), '  '),
  'P0001', 'invalid', 'sin motivo no se anula');
select throws_ok(format('select public.cancel_order(gen_random_uuid(), %L, %L, null, null)', current_setting('t.a'), repeat('a', 121)),
  'P0001', 'invalid', 'ni con un motivo de más de 120 letras');
select set_config('t.ca', public.cancel_order('00000000-0000-4000-8000-00000000e501', current_setting('t.a')::uuid,
  'El cliente canceló', null, null)::text, true);
select is(current_setting('t.ca')::jsonb ->> 'status', 'cancelled', 'queda anulado');
select is(current_setting('t.ca')::jsonb ->> 'cancelReason', 'El cliente canceló', 'con su motivo');
select is(pg_temp.on_hand(), 30, 'y los alfajores vuelven al stock');
select is((select e ->> 'status' from jsonb_array_elements(current_setting('t.ca')::jsonb -> 'timeline') as e order by e ->> 'at' desc limit 1),
  'cancelled', 'la línea de tiempo lo dice');
select is((public.cancel_order('00000000-0000-4000-8000-00000000e501', current_setting('t.a')::uuid, 'El cliente canceló', null, null)
  ->> 'version')::integer, 2, 'el mismo código dos veces anula una vez');
select throws_ok(format('select public.cancel_order(gen_random_uuid(), %L, %L, null, null)', current_setting('t.a'), 'Otro'),
  'P0001', 'invalid', 'uno anulado no se vuelve a anular');

-- Con S/ 20 pagados por Yape: devuelve S/ 10 en efectivo
select set_config('t.b', public.create_order(gen_random_uuid(),
  pg_temp.draft(2, '{"payment": {"method": "yape", "amountCents": 2000}}')) ->> 'id', true);
select throws_ok(format('select public.cancel_order(gen_random_uuid(), %L, %L, 2001, %L)', current_setting('t.b'), 'Sin stock', 'cash'),
  'P0001', 'invalid', 'no se devuelve más de lo pagado');
select throws_ok(format('select public.cancel_order(gen_random_uuid(), %L, %L, 1000, %L)', current_setting('t.b'), 'Sin stock', 'plin'),
  'P0001', 'invalid', 'ni con un medio apagado');
select throws_ok(format('select public.cancel_order(gen_random_uuid(), %L, %L, 1000, null)', current_setting('t.b'), 'Sin stock'),
  'P0001', 'invalid', 'ni sin medio');
select set_config('t.cb', public.cancel_order(gen_random_uuid(), current_setting('t.b')::uuid, 'Sin stock', 1000, 'cash')::text, true);
select is((current_setting('t.cb')::jsonb ->> 'paidCents')::integer, 1000, 'se puede devolver una parte: lo demás sigue pagado');
select is((select array[count(*) filter (where p.kind = 'payment' and p.voided_at is null), count(*) filter (where p.kind = 'refund')]::integer[]
  from public.payments p where p.order_id = current_setting('t.b')::uuid), array[1, 1], 'el pago original queda y la devolución es otra fila');
select is((select (p.paid_at at time zone 'America/Lima')::date from public.payments p where p.order_id = current_setting('t.b')::uuid and p.kind = 'refund'),
  (now() at time zone 'America/Lima')::date, 'con la fecha de hoy');

-- Uno entregado que quedó debiendo (pagó S/ 10 de S/ 24): sale de «Por cobrar» y de los totales del cliente
select set_config('t.c', public.create_order(gen_random_uuid(),
  pg_temp.draft(2, '{"payment": {"method": "cash", "amountCents": 1000}}')) ->> 'id', true);
select public.advance_order(current_setting('t.c')::uuid, 'new');
select public.advance_order(current_setting('t.c')::uuid, 'preparing');
select public.advance_order(current_setting('t.c')::uuid, 'ready');
select set_config('t.before', pg_temp.customer()::text, true);
select public.cancel_order(gen_random_uuid(), current_setting('t.c')::uuid, 'Error al anotar', 0, null);
select is(pg_temp.customer(), array[(current_setting('t.before')::integer[])[1] - 1, (current_setting('t.before')::integer[])[2] - 2400],
  'anular uno entregado le resta el pedido y lo gastado al cliente');
select ok(not (current_setting('t.c') = any (array(select e ->> 'id' from jsonb_array_elements(public.list_orders('to_collect') -> 'items') as e))),
  'y ya no está en «Por cobrar»');

-- Deshacer: vuelve el estado, el stock, lo pagado y el cliente
select set_config('t.stock', pg_temp.on_hand()::text, true);
select set_config('t.rc', public.revert_cancel(current_setting('t.c')::uuid)::text, true);
select is(current_setting('t.rc')::jsonb ->> 'status', 'delivered', 'deshacer devuelve el estado de antes');
select is(current_setting('t.rc')::jsonb ->> 'cancelReason', null, 'sin motivo de anulación');
select is(pg_temp.on_hand(), current_setting('t.stock')::integer - 2, 'vuelve a restar el stock');
select is(pg_temp.customer(), current_setting('t.before')::integer[], 'y repone los totales del cliente');
select throws_ok(format('select public.revert_cancel(%L)', current_setting('t.c')), 'P0001', 'conflict', 'el segundo «Deshacer»: conflicto');
select public.revert_cancel(current_setting('t.b')::uuid);
select is((select p.void_reason from public.payments p where p.order_id = current_setting('t.b')::uuid and p.kind = 'refund'),
  'Deshacer anulación', 'deshacer anula la devolución que se había hecho');

-- Pasados 10 minutos ya no se deshace
select tests.logout();
update public.order_status_events set at = at - interval '11 minutes' where order_id = current_setting('t.a')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009c2');
select throws_ok(format('select public.revert_cancel(%L)', current_setting('t.a')), 'P0001', 'invalid', 'pasados 10 minutos, no');

-- Una venta de mostrador anulada con todo devuelto conserva su número
select set_config('t.s', public.create_counter_sale(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000c01", "quantity": 1}]', 'cash')::text, true);
select is((public.cancel_order(gen_random_uuid(), (current_setting('t.s')::jsonb ->> 'id')::uuid, 'Venta deshecha', 1200, 'cash') ->> 'number'),
  current_setting('t.s')::jsonb ->> 'number', 'una venta de mostrador anulada conserva su número');
select tests.logout();

select * from finish();
