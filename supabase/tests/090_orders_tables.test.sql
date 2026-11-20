-- Las tablas de pedidos: sus reglas (también con el valor vacío), los textos por defecto y quién lee qué
select plan(42);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
select tests.make_user('00000000-0000-4000-8000-0000000009a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009a2', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents) values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-0000000009b1', 'Coqueta', 1200),
  ('00000000-0000-4000-8000-000000000a09', '00000000-0000-4000-8000-0000000009b2', 'Coqueta', 1200);
insert into public.customers (id, business_id, name, phone) values
  ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-0000000009b1', 'Ana (DEMO)', '+51900000990'),
  ('00000000-0000-4000-8000-000000000c09', '00000000-0000-4000-8000-0000000009b2', 'Otro (DEMO)', '+51900000991');

-- Un pedido de delivery que cumple todas las reglas; cada prueba cambia una sola cosa
create function pg_temp.order_with(p_changes jsonb) returns void language plpgsql as $$
declare
  v jsonb := jsonb_build_object(
    'business_id', '00000000-0000-4000-8000-0000000009b1', 'number', 1, 'customer_id', '00000000-0000-4000-8000-000000000c01',
    'channel', 'whatsapp', 'fulfillment', 'delivery', 'status', 'new', 'due_date', '2026-11-18', 'delivery_address', 'Jr. Lima 123',
    'delivery_fee_cents', 500, 'discount_cents', 0, 'subtotal_cents', 2400, 'total_cents', 2900, 'paid_cents', 0,
    'customer_name', 'Ana (DEMO)', 'items_summary', '2 Coquetas', 'items_count', 2) || p_changes;
begin
  insert into public.orders select * from jsonb_populate_record(null::public.orders, v || jsonb_build_object('id', gen_random_uuid(), 'created_at', now(), 'updated_at', now(), 'version', 1));
end;
$$;

select lives_ok($$select pg_temp.order_with('{}')$$, 'un pedido de delivery con todo en regla');
select throws_ok($$select pg_temp.order_with('{"number": 1}')$$, '23505', null, 'el número no se repite en el negocio');
select throws_ok($$select pg_temp.order_with('{"number": 2, "total_cents": 3000}')$$, '23514', null, 'el total es subtotal + delivery − descuento');
select throws_ok($$select pg_temp.order_with('{"number": 2, "paid_cents": 3000}')$$, '23514', null, 'lo pagado no pasa del total');
select throws_ok($$select pg_temp.order_with('{"number": 2, "status": "ready"}')$$, '23514', null, '«listo para recoger» solo existe si recoge');
select throws_ok($$select pg_temp.order_with('{"number": 2, "fulfillment": "pickup", "status": "on_the_way", "delivery_address": null}')$$, '23514', null, '«en camino» solo existe en delivery');
select throws_ok($$select pg_temp.order_with('{"number": 2, "delivery_address": null}')$$, '23514', null, 'el delivery lleva dirección');
select throws_ok($$select pg_temp.order_with('{"number": 2, "delivery_address": "   "}')$$, '23514', null, 'y no en blanco');
select throws_ok($$select pg_temp.order_with('{"number": 2, "discount_cents": 500, "total_cents": 2400}')$$, '23514', null, 'el descuento lleva motivo');
select throws_ok($$select pg_temp.order_with('{"number": 2, "status": "cancelled"}')$$, '23514', null, 'el anulado lleva motivo');
select throws_ok($$select pg_temp.order_with('{"number": 2, "status": "delivered"}')$$, '23514', null, 'el entregado lleva su fecha de entrega');
select throws_ok($$select pg_temp.order_with('{"number": 2, "customer_id": null}')$$, '23514', null, 'delivery y recoge llevan cliente');
select throws_ok($$select pg_temp.order_with('{"number": 2, "fulfillment": "counter", "status": "new", "customer_id": null, "delivery_address": null, "delivery_fee_cents": 0, "total_cents": 2400}')$$, '23514', null, 'el mostrador nace entregado');
select throws_ok($$select pg_temp.order_with('{"number": 2, "fulfillment": "counter", "status": "delivered", "delivered_at": "2026-11-18T16:00:00Z", "delivery_address": null, "delivery_fee_cents": 0, "total_cents": 2400}')$$, '23514', null, 'y sin cliente');
select throws_ok($$select pg_temp.order_with('{"number": 2, "channel": "telefono"}')$$, '23514', null, 'un canal que no existe');
select throws_ok($$select pg_temp.order_with('{"number": 2, "status": null}')$$, '23502', null, 'un estado vacío');
select throws_ok($$select pg_temp.order_with('{"number": 2, "items_count": 0}')$$, '23514', null, 'un pedido lleva al menos un alfajor');
select throws_ok($$select pg_temp.order_with('{"number": 2, "customer_id": "00000000-0000-4000-8000-000000000c09"}')$$, '23503', null, 'el cliente es del mismo negocio');
select ok((select reloptions from pg_catalog.pg_class where oid = 'public.orders'::regclass) @> array['fillfactor=85'], 'orders deja espacio libre en cada bloque (fillfactor 85)');

select set_config('t.order', (select id::text from public.orders where business_id = '00000000-0000-4000-8000-0000000009b1' and number = 1), true);
-- Líneas, estados y pagos
select throws_ok(format($$insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents) values ('00000000-0000-4000-8000-0000000009b1', %L, '00000000-0000-4000-8000-000000000a01', 'Coqueta', 0, 1200)$$, current_setting('t.order')), '23514', null, 'una línea lleva al menos un alfajor');
select throws_ok(format($$insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents) values ('00000000-0000-4000-8000-0000000009b1', %L, '00000000-0000-4000-8000-000000000a01', 'Coqueta', 1, 0)$$, current_setting('t.order')), '23514', null, 'con un precio mayor que cero');
select throws_ok(format($$insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents) values ('00000000-0000-4000-8000-0000000009b1', %L, '00000000-0000-4000-8000-000000000a09', 'Coqueta', 1, 1200)$$, current_setting('t.order')), '23503', null, 'una línea no apunta al producto de otro negocio');
insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents) values ('00000000-0000-4000-8000-0000000009b1', current_setting('t.order')::uuid, '00000000-0000-4000-8000-000000000a01', 'Coqueta', 2, 1200);
select throws_ok(format($$insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents) values ('00000000-0000-4000-8000-0000000009b1', %L, '00000000-0000-4000-8000-000000000a01', 'Coqueta', 1, 1200)$$, current_setting('t.order')), '23505', null, 'un producto una sola vez por pedido');
select throws_ok(format($$insert into public.order_status_events (business_id, order_id, status) values ('00000000-0000-4000-8000-0000000009b1', %L, 'shipped')$$, current_setting('t.order')), '23514', null, 'un estado que no existe en la línea de tiempo');
select throws_ok(format($$insert into public.payments (business_id, order_id, kind, method, amount_cents) values ('00000000-0000-4000-8000-0000000009b1', %L, 'payment', 'yape', 0)$$, current_setting('t.order')), '23514', null, 'un pago de cero');
select throws_ok(format($$insert into public.payments (business_id, order_id, kind, method, amount_cents) values ('00000000-0000-4000-8000-0000000009b1', %L, 'tip', 'yape', 100)$$, current_setting('t.order')), '23514', null, 'un tipo de pago que no existe');
select throws_ok(format($$insert into public.payments (business_id, order_id, kind, method, amount_cents) values ('00000000-0000-4000-8000-0000000009b1', %L, 'payment', 'tarjeta', 100)$$, current_setting('t.order')), '23514', null, 'un medio que no existe');
select throws_ok(format($$insert into public.payments (business_id, order_id, kind, method, amount_cents, voided_at) values ('00000000-0000-4000-8000-0000000009b1', %L, 'payment', 'yape', 100, now())$$, current_setting('t.order')), '23514', null, 'un pago anulado lleva su motivo');

-- Movimientos de stock de un pedido
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000a01', 'sale', -1)$$, '23514', null, 'una venta lleva su pedido');
select throws_ok(format($$insert into public.stock_movements (business_id, product_id, kind, quantity, order_id) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-000000000a01', 'production', 1, %L)$$, current_setting('t.order')), '23514', null, 'una producción no');

-- Clientes
select throws_ok($$insert into public.customers (business_id, name, phone) values ('00000000-0000-4000-8000-0000000009b1', 'Otra', '+51900000990')$$, '23505', null, 'un teléfono, un cliente en cada negocio');
select throws_ok($$insert into public.customers (business_id, name, phone) values ('00000000-0000-4000-8000-0000000009b1', 'Otra', null)$$, '23514', null, 'sin teléfono solo si se borraron sus datos');
select throws_ok($$insert into public.customers (business_id, name, phone) values ('00000000-0000-4000-8000-0000000009b1', '  ', '+51900000992')$$, '23514', null, 'un nombre en blanco');
select throws_ok($$insert into public.customers (business_id, name, phone) values ('00000000-0000-4000-8000-0000000009b1', 'Otra', '987654321')$$, '23514', null, 'el teléfono con +51');

-- Textos de WhatsApp
select is((select count(*)::integer from public.message_templates where business_id = '00000000-0000-4000-8000-0000000009b1'), 6, 'un negocio nuevo nace con sus seis textos');
select is((select body from public.message_templates where business_id = '00000000-0000-4000-8000-0000000009b1' and key = 'on_the_way'),
  'Hola {nombre}, tu pedido {numero} va en camino. {pago}', 'los de la maqueta');
select is((select count(*)::integer from public.businesses b where not exists (select 1 from public.message_templates t where t.business_id = b.id)), 0, 'los negocios de antes también los tienen');
select throws_ok($$update public.message_templates set body = '' where business_id = '00000000-0000-4000-8000-0000000009b1' and key = 'ready'$$, '23514', null, 'un texto vacío no se guarda');

-- Quién lee qué
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select is((select count(*)::integer from public.orders), 1, 'el dueño lee sus pedidos y no los de otro negocio');
select is((select array_agg(name) from public.customers), array['Ana (DEMO)'], 'sus clientes');
select throws_ok($$insert into public.payments (business_id, order_id, kind, method, amount_cents) select business_id, id, 'payment', 'yape', 100 from public.orders$$, '42501', null, 'la app no registra pagos directo');
select throws_ok($$update public.message_templates set body = 'x'$$, '42501', null, 'ni cambia los textos directo');
select tests.logout();

select * from finish();
