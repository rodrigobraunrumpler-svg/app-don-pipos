-- Ingresos: los pagos de los pedidos por fecha de pago (D11), las devoluciones en su día y los ingresos a mano
-- (docs/spec/income.md)
select plan(22);

select tests.make_user('00000000-0000-4000-8000-0000000012c1');
select tests.make_user('00000000-0000-4000-8000-0000000012c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000012d1', '00000000-0000-4000-8000-0000000012c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000012d2', '00000000-0000-4000-8000-0000000012c2', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}', delivery_fee_cents = 0
where business_id = '00000000-0000-4000-8000-0000000012d1';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000001201', '00000000-0000-4000-8000-0000000012d1', 'Coqueta', 1200, 0);
select set_config('t.today', ((now() at time zone 'America/Lima')::date)::text, true);
select set_config('t.yesterday', ((now() at time zone 'America/Lima')::date - 1)::text, true);

create function pg_temp.order_with(p_method text, p_cents integer) returns uuid language sql as $$
  select (public.create_order(gen_random_uuid(), jsonb_build_object(
    'customer', jsonb_build_object('phone', '+51900000994', 'name', 'Rosa (DEMO)'), 'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-000000001201', 'quantity', 2)),
    'payment', jsonb_build_object('method', p_method, 'amountCents', p_cents))) ->> 'id')::uuid;
$$;
create function pg_temp.kinds(p_page jsonb) returns text[] language sql as $$
  select array(select e ->> 'kind' from jsonb_array_elements(p_page -> 'items') as e order by 1);
$$;
grant execute on function pg_temp.order_with(text, integer), pg_temp.kinds(jsonb) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000012c1');
-- #1: adelanto de S/ 20 en efectivo (se pasa a ayer) y después anulado con la devolución hoy; #2: Yape, cambiado a efectivo;
-- #3: efectivo, el 10 de noviembre a las 23:30 de Lima
select set_config('t.o1', pg_temp.order_with('cash', 2000)::text, true);
select set_config('t.o2', pg_temp.order_with('yape', 2400)::text, true);
select set_config('t.o3', pg_temp.order_with('cash', 2400)::text, true);
select public.change_payment_method(gen_random_uuid(), (select p.id from public.payments p where p.order_id = current_setting('t.o2')::uuid), 'cash');
select tests.logout();
update public.payments set paid_at = (current_setting('t.yesterday')::date + time '10:00') at time zone 'America/Lima'
where order_id = current_setting('t.o1')::uuid;
update public.payments set paid_at = '2026-11-10T23:30:00-05:00' where order_id = current_setting('t.o3')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000012c1');
select public.cancel_order(gen_random_uuid(), current_setting('t.o1')::uuid, 'El cliente canceló', 2000, 'cash');

-- Anotar un ingreso a mano
select set_config('t.m1', public.create_manual_income('00000000-0000-4000-8000-0000000012e1', ' Venta a un café (DEMO) ', 1500, 'cash', null)::text, true);
select is(current_setting('t.m1')::jsonb - 'id' - 'receivedAt',
  '{"description": "Venta a un café (DEMO)", "amountCents": 1500, "method": "cash", "voidedAt": null}'::jsonb, 'el ingreso como lo ve la app');
select ok((current_setting('t.m1')::jsonb ->> 'receivedAt')::timestamptz between now() - interval '1 minute' and now(), 'hoy es ahora');
select is(public.create_manual_income('00000000-0000-4000-8000-0000000012e1', ' Venta a un café (DEMO) ', 1500, 'cash', null) ->> 'id',
  current_setting('t.m1')::jsonb ->> 'id', 'el mismo código devuelve el mismo ingreso');
select throws_ok(format('select public.create_manual_income(%L, %L, 1600, %L, null)', '00000000-0000-4000-8000-0000000012e1',
  'Venta a un café (DEMO)', 'cash'), 'P0001', 'conflict', 'con otros datos, conflict');
select is((public.create_manual_income(gen_random_uuid(), 'Evento (DEMO)', 700, 'yape', current_setting('t.yesterday')::date)
  ->> 'receivedAt')::timestamptz, (current_setting('t.yesterday')::date + time '12:00') at time zone 'America/Lima',
  'uno de ayer queda a las 12:00 de Lima');
select throws_ok(format('select public.create_manual_income(gen_random_uuid(), %L, 700, %L, %L)', 'Evento', 'cash',
  current_setting('t.yesterday')::date - 1), 'P0001', 'invalid', 'antes de ayer no');
select throws_ok(format('select public.create_manual_income(gen_random_uuid(), %L, 700, %L, %L)', 'Evento', 'cash',
  current_setting('t.today')::date + 1), 'P0001', 'invalid', 'ni mañana');
select throws_ok('select public.create_manual_income(gen_random_uuid(), ''  '', 700, ''cash'', null)', 'P0001', 'invalid',
  'ni sin descripción');
select throws_ok('select public.create_manual_income(gen_random_uuid(), ''Evento'', 700, ''plin'', null)', 'P0001', 'invalid',
  'ni con un medio apagado');

-- El resumen: hoy, el pago de #2 (2400, ya en efectivo) − la devolución de #1 (2000) + el de a mano (1500);
-- ayer, el adelanto de #1 (2000) y el evento (700). La devolución resta hoy: ayer no cambia
select is(public.income_summary(current_setting('t.today')::date, current_setting('t.today')::date) - 'byDay',
  '{"totalCents": 1900, "byMethod": {"cash": 1900, "yape": 0, "plin": 0, "transfer": 0}}'::jsonb,
  'hoy: los pagos sin anular menos la devolución de hoy, más lo de a mano, por medio');
select is(public.income_summary(current_setting('t.yesterday')::date, current_setting('t.today')::date) -> 'byDay',
  jsonb_build_array(jsonb_build_object('day', current_setting('t.yesterday'), 'totalCents', 2700),
    jsonb_build_object('day', current_setting('t.today'), 'totalCents', 1900)), 'por día: lo de ayer no cambió con la devolución');
select is((public.income_summary('2026-11-10', '2026-11-10') ->> 'totalCents')::integer, 2400, 'un pago a las 23:30 de Lima cuenta ese día');
select is((public.income_summary('2026-11-11', '2026-11-11') ->> 'totalCents')::integer, 0, 'y no el siguiente');

-- La lista: los pagos (y las devoluciones) con su pedido y los de a mano, del más nuevo al más viejo
select is(pg_temp.kinds(public.list_income(null, null, 20, null)), array['manual', 'manual', 'payment', 'payment', 'payment', 'refund'],
  'mezcla pagos, devoluciones y lo de a mano, sin los anulados');
select is((select e - 'id' - 'at' - 'orderId' from jsonb_array_elements(public.list_income(null, null, 20, null) -> 'items') as e
  where e ->> 'kind' = 'refund'), '{"kind": "refund", "amountCents": 2000, "method": "cash", "orderNumber": 1, "customerName": "Rosa (DEMO)", "description": null}'::jsonb,
  'una devolución con su pedido');
select set_config('t.p1', public.list_income(null, null, 4, null)::text, true);
select is((current_setting('t.p1')::jsonb -> 'meta') - 'nextCursor', '{"limit": 4, "total": 6, "hasMore": true}'::jsonb, 'por páginas, con el total');
select set_config('t.p2', public.list_income(null, null, 4, current_setting('t.p1')::jsonb -> 'meta' ->> 'nextCursor')::text, true);
select is(array[jsonb_array_length(current_setting('t.p2')::jsonb -> 'items'), (select count(distinct e ->> 'id')::integer from (
    select jsonb_array_elements(current_setting('t.p1')::jsonb -> 'items') as e
    union all select jsonb_array_elements(current_setting('t.p2')::jsonb -> 'items')) as x),
    (current_setting('t.p2')::jsonb -> 'items' -> 1 ->> 'orderNumber')::integer],
  array[2, 6, 3], 'la página siguiente sigue donde quedó, sin repetir, y termina en el pago más viejo');

-- Anular un ingreso a mano
select ok(public.void_manual_income((current_setting('t.m1')::jsonb ->> 'id')::uuid, 'Anotado dos veces') ->> 'voidedAt' is not null,
  'un ingreso a mano se anula');
select is((public.income_summary(current_setting('t.today')::date, current_setting('t.today')::date) ->> 'totalCents')::integer, 400,
  'y deja de contar');
select throws_ok(format('select public.void_manual_income(%L, %L)', current_setting('t.m1')::jsonb ->> 'id', 'Otra vez'), 'P0001', 'invalid',
  'no se anula dos veces');

-- Otro negocio
select tests.login_as('00000000-0000-4000-8000-0000000012c2');
select is((public.income_summary(current_setting('t.yesterday')::date, current_setting('t.today')::date) ->> 'totalCents')::integer, 0,
  'otro dueño no ve los ingresos');
select is(public.list_income(null, null, 20, null) -> 'items', '[]'::jsonb, 'ni la lista');
select tests.logout();

select * from finish();
