-- Crear pedidos y ventas de mostrador: número, precios congelados, cliente, stock, pago y rechazos
select plan(40);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
select tests.make_user('00000000-0000-4000-8000-0000000009a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009a2', 'Negocio B (DEMO)');
update public.business_settings set delivery_fee_cents = 500, active_payment_methods = '{cash,yape}' where business_id = '00000000-0000-4000-8000-0000000009b1';
insert into public.products (id, business_id, name, price_cents, cost_cents, is_active) values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-0000000009b1', 'Coqueta', 1200, 510, true),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-0000000009b1', 'Pipo Crush', 1300, null, true),
  ('00000000-0000-4000-8000-000000000a03', '00000000-0000-4000-8000-0000000009b1', 'Inactivo', 1200, null, false),
  ('00000000-0000-4000-8000-000000000a09', '00000000-0000-4000-8000-0000000009b2', 'De otro', 1200, null, true);

-- Un pedido de delivery válido; cada prueba cambia una sola cosa
create function pg_temp.draft(p_changes jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'customer', jsonb_build_object('phone', '+51900000990', 'name', 'Ana (DEMO)'),
    'channel', 'whatsapp', 'fulfillment', 'delivery', 'promisedAt', null, 'scheduledFor', null,
    'deliveryAddress', 'Jr. Lima 123', 'discountCents', 0, 'discountReason', null, 'note', null,
    'lines', jsonb_build_array(
      jsonb_build_object('productId', '00000000-0000-4000-8000-000000000a01', 'quantity', 2),
      jsonb_build_object('productId', '00000000-0000-4000-8000-000000000a02', 'quantity', 1)),
    'payment', jsonb_build_object('method', 'yape', 'amountCents', 2000)) || p_changes;
$$;
-- La llama el dueño de prueba: necesita permiso
grant execute on function pg_temp.draft(jsonb) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select set_config('t.o1', public.create_order('00000000-0000-4000-8000-00000000e001', pg_temp.draft())::text, true);
select is((current_setting('t.o1')::jsonb ->> 'number')::integer, 1, 'el primer pedido es el 1');
select is(current_setting('t.o1')::jsonb ->> 'itemsSummary', '2 Coquetas, 1 Pipo Crush', 'el resumen, con el plural de la maqueta');
select is((current_setting('t.o1')::jsonb ->> 'itemsCount')::integer, 3, 'cuántos alfajores lleva');
select is((current_setting('t.o1')::jsonb ->> 'deliveryFeeCents')::integer, 500, 'copia el costo del delivery del negocio');
select is((current_setting('t.o1')::jsonb ->> 'totalCents')::integer, 4200, '2 × 12 + 13 + 5 = S/ 42.00');
select is((current_setting('t.o1')::jsonb ->> 'paidCents')::integer, 2000, 'con el pago de S/ 20.00');
select is(current_setting('t.o1')::jsonb ->> 'status', 'new', 'nace nuevo');
select is(current_setting('t.o1')::jsonb ->> 'customerName', 'Ana (DEMO)', 'con el nombre del cliente del momento');
select is(current_setting('t.o1')::jsonb -> 'timeline' -> 0 ->> 'status', 'new', 'y su primer estado en la línea de tiempo');
select is((current_setting('t.o1')::jsonb ->> 'dueDate'), ((now() at time zone 'America/Lima')::date)::text, 'su día es el de Lima');
select matches(current_setting('t.o1')::jsonb ->> 'createdAt', '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$', 'las fechas, con milisegundos y en UTC');

select is(public.create_order('00000000-0000-4000-8000-00000000e001', pg_temp.draft()) ->> 'number', '1', 'el mismo código y los mismos datos devuelven el mismo pedido');
select throws_ok($$select public.create_order('00000000-0000-4000-8000-00000000e001', pg_temp.draft('{"note": "otra"}'))$$, 'P0001', 'conflict', 'el mismo código con otros datos es un conflicto');

select set_config('t.o2', public.create_order(gen_random_uuid(), pg_temp.draft(jsonb_build_object(
  'customer', jsonb_build_object('phone', '+51900000990'), 'fulfillment', 'pickup', 'deliveryAddress', null, 'payment', null,
  'scheduledFor', ((now() at time zone 'America/Lima')::date + 2)::text)))::text, true);
select is((current_setting('t.o2')::jsonb ->> 'number')::integer, 2, 'el segundo es el 2');
select is(current_setting('t.o2')::jsonb ->> 'dueDate', ((now() at time zone 'America/Lima')::date + 2)::text, 'para otro día: su día es ese');
select is((current_setting('t.o2')::jsonb ->> 'deliveryFeeCents')::integer, 0, 'recoge no paga delivery');
select is(public.create_order(gen_random_uuid(), pg_temp.draft(jsonb_build_object('scheduledFor', ((now() at time zone 'America/Lima')::date)::text))) ->> 'scheduledFor', null, 'para hoy, queda como de hoy');

select tests.logout();
select results_eq(
  $$select name, phone::text, address, orders_count, spent_cents::integer from public.customers where business_id = '00000000-0000-4000-8000-0000000009b1'$$,
  $$values ('Ana (DEMO)', '+51900000990', 'Jr. Lima 123', 3, 4200 + 3700 + 4200)$$,
  'un solo cliente por teléfono, con sus totales; sin nombre, mantiene el que tenía');
update public.products set price_cents = 1500, name = 'Coqueta nueva' where id = '00000000-0000-4000-8000-000000000a01';
select results_eq(
  format($$select product_name, unit_price_cents::integer, unit_cost_cents::integer from public.order_lines where order_id = %L and product_id = '00000000-0000-4000-8000-000000000a01'$$, current_setting('t.o1')::jsonb ->> 'id'),
  $$values ('Coqueta', 1200, 510)$$, 'el nombre, el precio y el costo quedan como eran (D9)');
select is((select on_hand from public.stock_levels where product_id = '00000000-0000-4000-8000-000000000a01'), -6, 'el stock baja, también a negativo (D12)');
select is((select count(*)::integer from public.stock_movements where kind = 'sale' and order_id is not null and request_id is null and business_id = '00000000-0000-4000-8000-0000000009b1'), 6, 'un movimiento de venta por línea, con su pedido y sin código');
select tests.login_as('00000000-0000-4000-8000-0000000009a1');

-- Lo que no se guarda
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"fulfillment": "counter"}'))$$, 'P0001', 'invalid', 'el mostrador va por su propia función');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"customer": null}'))$$, 'P0001', 'invalid', 'delivery sin cliente');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"customer": {"phone": "987654321", "name": "X"}}'))$$, 'P0001', 'invalid', 'un teléfono sin +51');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"customer": {"phone": "+51900000991"}}'))$$, 'P0001', 'invalid', 'un cliente nuevo sin nombre');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"lines": []}'))$$, 'P0001', 'invalid', 'sin alfajores');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"lines": [{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 1}, {"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 1}]}'))$$, 'P0001', 'invalid', 'un alfajor repetido');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"lines": [{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 0}]}'))$$, 'P0001', 'invalid', 'una cantidad de 0');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"deliveryAddress": null}'))$$, 'P0001', 'invalid', 'delivery sin dirección');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"discountCents": 500}'))$$, 'P0001', 'invalid', 'un descuento sin motivo');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"discountCents": 99999, "discountReason": "precio especial"}'))$$, 'P0001', 'invalid', 'un descuento mayor que el pedido');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"payment": {"method": "yape", "amountCents": 99999}}'))$$, 'P0001', 'invalid', 'un pago mayor que el total');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"payment": {"method": "plin", "amountCents": 100}}'))$$, 'P0001', 'invalid', 'un medio de pago apagado');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"scheduledFor": "2020-01-01"}'))$$, 'P0001', 'invalid', 'para un día que ya pasó');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"lines": [{"productId": "00000000-0000-4000-8000-000000000a09", "quantity": 1}]}'))$$, 'P0001', 'not_found', 'un alfajor de otro negocio');
select throws_ok($$select public.create_order(gen_random_uuid(), pg_temp.draft('{"lines": [{"productId": "00000000-0000-4000-8000-000000000a03", "quantity": 1}]}'))$$, 'P0001', 'not_found', 'un alfajor desactivado');

-- Venta de mostrador
select set_config('t.v', public.create_counter_sale('00000000-0000-4000-8000-00000000e002', '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 2}]', 'cash')::text, true);
select is(current_setting('t.v')::jsonb - 'id' - 'number' - 'createdAt' - 'deliveredAt' - 'dueDate' - 'lines' - 'payments' - 'timeline' - 'version',
  '{"status": "delivered", "fulfillment": "counter", "channel": "local", "customerId": null, "customerName": null, "customer": null, "promisedAt": null, "cancelReason": null, "scheduledFor": null, "deliveryAddress": null, "deliveryFeeCents": 0, "discountCents": 0, "discountReason": null, "subtotalCents": 2600, "totalCents": 2600, "paidCents": 2600, "note": null, "itemsSummary": "2 Pipo Crush", "itemsCount": 2}'::jsonb,
  'la venta de mostrador: entregada, sin cliente y pagada');
select is(current_setting('t.v')::jsonb -> 'payments' -> 0 ->> 'method', 'cash', 'con un pago en efectivo por el total');
select throws_ok($$select public.create_counter_sale('00000000-0000-4000-8000-00000000e002', '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 3}]', 'cash')$$, 'P0001', 'conflict', 'el mismo código con otros datos es un conflicto');
select throws_ok($$select public.create_counter_sale(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 1}]', 'plin')$$, 'P0001', 'invalid', 'con un medio apagado, no');
select tests.logout();

select * from finish();
