-- Avanzar un pedido, deshacer su estado, cobrar, lo apartado en el stock y el «Deshacer» del stock que no toca ventas
select plan(31);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}', delivery_fee_cents = 0 where business_id = '00000000-0000-4000-8000-0000000009b1';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-0000000009b1', 'Coqueta', 1200, 2),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-0000000009b1', 'Morenita', 1200, 2);

create function pg_temp.draft(p_fulfillment text, p_quantity integer, p_changes jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'customer', jsonb_build_object('phone', '+51900000990', 'name', 'Ana (DEMO)'), 'channel', 'whatsapp',
    'fulfillment', p_fulfillment, 'deliveryAddress', case when p_fulfillment = 'delivery' then 'Jr. Lima 123' end,
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-000000000a01', 'quantity', p_quantity))) || p_changes;
$$;
grant execute on function pg_temp.draft(text, integer, jsonb) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 10}]');
select set_config('t.d', public.create_order(gen_random_uuid(), pg_temp.draft('delivery', 3)) ->> 'id', true);
select set_config('t.p', public.create_order(gen_random_uuid(), pg_temp.draft('pickup', 2)) ->> 'id', true);

-- Avanzar
select is(public.advance_order(current_setting('t.d')::uuid, 'new') ->> 'status', 'preparing', 'delivery: de nuevo a preparando');
select throws_ok(format('select public.advance_order(%L, %L)', current_setting('t.d'), 'new'), 'P0001', 'conflict', 'con un estado viejo (doble toque), conflicto');
select is(public.advance_order(current_setting('t.d')::uuid, 'preparing') ->> 'status', 'on_the_way', 'de preparando a en camino');
select isnt(public.advance_order(current_setting('t.d')::uuid, 'on_the_way') ->> 'deliveredAt', null, 'entregado, con su fecha de entrega');
select throws_ok(format('select public.advance_order(%L, %L)', current_setting('t.d'), 'delivered'), 'P0001', 'invalid', 'un entregado no avanza');
select is(public.advance_order(current_setting('t.p')::uuid, 'new') ->> 'status', 'preparing', 'recoge: de nuevo a preparando');
select is(public.advance_order(current_setting('t.p')::uuid, 'preparing') ->> 'status', 'ready', 'y a listo para recoger');
select throws_ok($$select public.advance_order((public.create_counter_sale(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 1}]', 'cash') ->> 'id')::uuid, 'delivered')$$,
  'P0001', 'invalid', 'una venta de mostrador no avanza');

-- Deshacer
select set_config('t.rp', public.revert_status(current_setting('t.p')::uuid, 'ready')::text, true);
select is(current_setting('t.rp')::jsonb ->> 'status', 'preparing', 'deshacer vuelve al estado anterior');
select is((select array_agg(e ->> 'status') from jsonb_array_elements(current_setting('t.rp')::jsonb -> 'timeline') as e), array['new', 'preparing'], 'y la línea de tiempo oculta el deshecho');
select throws_ok(format('select public.revert_status(%L, %L)', current_setting('t.p'), 'ready'), 'P0001', 'conflict', 'deshacer otra vez el mismo estado: conflicto');
select is(public.revert_status(current_setting('t.d')::uuid, 'delivered') ->> 'deliveredAt', null, 'deshacer «entregado» borra la fecha de entrega');
select throws_ok($$select public.revert_status((public.create_order(gen_random_uuid(), pg_temp.draft('pickup', 1)) ->> 'id')::uuid, 'new')$$, 'P0001', 'invalid', 'sin un estado anterior no hay qué deshacer');
select public.advance_order(current_setting('t.p')::uuid, 'preparing');
select tests.logout();
update public.order_status_events set at = at - interval '11 minutes' where order_id = current_setting('t.p')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select throws_ok(format('select public.revert_status(%L, %L)', current_setting('t.p'), 'ready'), 'P0001', 'invalid', 'pasados 10 minutos ya no se deshace');

-- Cobrar (el delivery: S/ 36.00, sin pagos)
select throws_ok(format('select public.add_payment(gen_random_uuid(), %L, %L, 0)', current_setting('t.d'), 'yape'), 'P0001', 'invalid', 'un pago de cero');
select throws_ok(format('select public.add_payment(gen_random_uuid(), %L, %L, -100)', current_setting('t.d'), 'yape'), 'P0001', 'invalid', 'un pago negativo');
select throws_ok(format('select public.add_payment(gen_random_uuid(), %L, %L, 3601)', current_setting('t.d'), 'yape'), 'P0001', 'invalid', 'más de lo que falta');
select throws_ok(format('select public.add_payment(gen_random_uuid(), %L, %L, 100)', current_setting('t.d'), 'plin'), 'P0001', 'invalid', 'con un medio apagado');
select is((public.add_payment('00000000-0000-4000-8000-00000000e101', current_setting('t.d')::uuid, 'yape', 1000) ->> 'paidCents')::integer, 1000, 'un pago suma a lo pagado');
select is((public.add_payment('00000000-0000-4000-8000-00000000e101', current_setting('t.d')::uuid, 'yape', 1000) ->> 'paidCents')::integer, 1000, 'el mismo código dos veces cobra una sola vez');
select throws_ok(format('select public.add_payment(%L, %L, %L, 2000)', '00000000-0000-4000-8000-00000000e101', current_setting('t.d'), 'yape'), 'P0001', 'conflict', 'el mismo código con otro monto es un conflicto');
select is((public.add_payment(gen_random_uuid(), current_setting('t.d')::uuid, 'cash', 2600) ->> 'paidCents')::integer, 3600, 'se puede cobrar todo lo que falta');
select throws_ok(format('select public.add_payment(gen_random_uuid(), %L, %L, 1)', current_setting('t.d'), 'cash'), 'P0001', 'invalid', 'pagado del todo, no recibe más');
select is((select count(*)::integer from public.payments where order_id = current_setting('t.d')::uuid), 2, 'y los pagos quedan uno por uno');
select set_config('t.c', public.create_order(gen_random_uuid(), pg_temp.draft('pickup', 1,
  '{"lines": [{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 1}]}')) ->> 'id', true);
select tests.logout();
update public.orders set status = 'cancelled', cancel_reason = 'prueba' where id = current_setting('t.c')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select throws_ok(format('select public.add_payment(gen_random_uuid(), %L, %L, 100)', current_setting('t.c'), 'cash'), 'P0001', 'invalid', 'un anulado no recibe pagos');

-- Lo apartado: el delivery en camino (3) y el de recoger listo (2). El de «sin un estado anterior» se deshizo con su error
select is((select (e ->> 'reserved')::integer from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'Coqueta'), 5, 'los pedidos sin entregar ni anular apartan sus alfajores (3 + 2)');
select public.advance_order(current_setting('t.d')::uuid, 'on_the_way');
select is((select (e ->> 'reserved')::integer from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'Coqueta'), 2, 'al entregar, dejan de estar apartados');
select public.create_order(gen_random_uuid(), pg_temp.draft('pickup', 20, jsonb_build_object('customer', jsonb_build_object('phone', '+51900000990'), 'scheduledFor', ((now() at time zone 'America/Lima')::date + 3)::text)));
select is((select e ->> 'state' from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'Coqueta'), 'owed', 'un pedido para otro día más grande que lo libre: faltan para pedidos, no «revisar»');
select is((select (e ->> 'physical')::integer from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'Coqueta'), 7, 'en la nevera quedan los 10 hechos menos los 3 entregados');

-- El «Deshacer» del stock nunca toca una venta: una venta no lleva código de registro, y el de un pedido no encuentra nada
select tests.logout();
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, request_id, order_id)
  select o.business_id, '00000000-0000-4000-8000-000000000a01', 'sale', -1, gen_random_uuid(), o.id from public.orders o where o.id = current_setting('t.d')::uuid$$,
  '23514', null, 'una venta nunca lleva código de registro');
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select throws_ok(format('select public.revert_stock_change(%L)', current_setting('t.d')), 'P0001', 'not_found', 'deshacer en el stock con el código de un pedido no encuentra nada');
select tests.logout();

select * from finish();
