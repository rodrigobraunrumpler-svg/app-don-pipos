-- Inicio y reportes (docs/spec/reports.md §3 y §8): el resumen de hoy, el periodo con el anterior, el ranking y lo que
-- se exporta, con dos semanas de noviembre armadas a mano
select plan(25);

select tests.make_user('00000000-0000-4000-8000-0000000014c1');
select tests.make_user('00000000-0000-4000-8000-0000000014c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000014d1', '00000000-0000-4000-8000-0000000014c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000014d2', '00000000-0000-4000-8000-0000000014c2', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape,transfer}', delivery_fee_cents = 0
where business_id = '00000000-0000-4000-8000-0000000014d1';
insert into public.products (id, business_id, name, price_cents, cost_cents, min_stock) values
  ('00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-0000000014d1', 'Coqueta', 1200, 500, 0),
  ('00000000-0000-4000-8000-000000001402', '00000000-0000-4000-8000-0000000014d1', 'Limon Kiss', 1200, null, 0);
select set_config('t.today', ((now() at time zone 'America/Lima')::date)::text, true);

create function pg_temp.order_with(p_product text, p_quantity integer, p_method text, p_cents integer) returns uuid language sql as $$
  select (public.create_order(gen_random_uuid(), jsonb_build_object(
    'customer', jsonb_build_object('phone', '+51900000996', 'name', 'Rosa (DEMO)'), 'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', p_product, 'quantity', p_quantity)))
    || case when p_cents > 0 then jsonb_build_object('payment', jsonb_build_object('method', p_method, 'amountCents', p_cents))
       else '{}'::jsonb end) ->> 'id')::uuid;
$$;
-- Lleva un pedido a un momento de Lima: creado, del día y entregado (o no), con su pago a otra hora
create function pg_temp.place(p_order text, p_created text, p_due date, p_delivered text, p_paid text) returns void language sql as $$
  update public.orders set created_at = p_created::timestamptz, due_date = p_due,
    status = case when p_delivered is null then status else 'delivered' end, delivered_at = p_delivered::timestamptz
  where id = p_order::uuid;
  update public.payments set paid_at = p_paid::timestamptz where order_id = p_order::uuid and kind = 'payment';
$$;
grant execute on function pg_temp.order_with(text, integer, text, integer) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000014c1');
select set_config('t.cat', public.save_expense_category(null, null, 'Insumos', 'basket-outline') ->> 'id', true);
-- Semana 1 (lunes 2 a domingo 8): #1 dos Coquetas en efectivo, entregado el martes 3 y del local; #2 una Limon Kiss por
-- Yape, pagada y entregada el domingo 8 a las 23:30 de Lima. Semana 2 (lunes 9 a domingo 15): #3 dos Coquetas, pagadas
-- el lunes 9 a las 00:30 de Lima; #4 una Coqueta entregada el martes 10 y anulada con su devolución el miércoles 11
select set_config('t.o1', pg_temp.order_with('00000000-0000-4000-8000-000000001401', 2, 'cash', 2400)::text, true);
select set_config('t.o2', pg_temp.order_with('00000000-0000-4000-8000-000000001402', 1, 'yape', 1200)::text, true);
select set_config('t.o3', pg_temp.order_with('00000000-0000-4000-8000-000000001401', 2, 'cash', 2400)::text, true);
select set_config('t.o4', pg_temp.order_with('00000000-0000-4000-8000-000000001401', 1, 'cash', 1200)::text, true);
select public.create_expense(gen_random_uuid(), current_setting('t.cat')::uuid, 500, 'cash', 'Harina', '2026-11-03T12:00:00-05:00');
select public.create_expense(gen_random_uuid(), current_setting('t.cat')::uuid, 300, 'yape', 'Cajas', '2026-11-10T12:00:00-05:00');
select public.void_expense((public.create_expense(gen_random_uuid(), current_setting('t.cat')::uuid, 999, 'cash', 'Error',
  '2026-11-10T13:00:00-05:00') ->> 'id')::uuid, 'Anotado dos veces');
select set_config('t.m', public.create_manual_income(gen_random_uuid(), 'Evento (DEMO)', 700, 'transfer', null) ->> 'id', true);
-- Hoy: #5 dos Coquetas por Yape, entregado; #6 dos Limon Kiss sin pagar; #7 de ayer, sin pagar ni entregar; S/ 5 a mano
select set_config('t.o5', pg_temp.order_with('00000000-0000-4000-8000-000000001401', 2, 'yape', 2400)::text, true);
select pg_temp.order_with('00000000-0000-4000-8000-000000001402', 2, 'cash', 0);
select set_config('t.o7', pg_temp.order_with('00000000-0000-4000-8000-000000001401', 2, 'cash', 0)::text, true);
select public.create_manual_income(gen_random_uuid(), 'Venta a un café (DEMO)', 500, 'cash', null);
select tests.logout();
select pg_temp.place(current_setting('t.o1'), '2026-11-03T10:00:00-05:00', '2026-11-03', '2026-11-03T15:00:00-05:00', '2026-11-03T15:00:00-05:00');
update public.orders set channel = 'local' where id = current_setting('t.o1')::uuid;
select pg_temp.place(current_setting('t.o2'), '2026-11-08T20:00:00-05:00', '2026-11-08', '2026-11-08T23:30:00-05:00', '2026-11-08T23:30:00-05:00');
select pg_temp.place(current_setting('t.o3'), '2026-11-09T00:20:00-05:00', '2026-11-09', '2026-11-09T10:00:00-05:00', '2026-11-09T00:30:00-05:00');
select pg_temp.place(current_setting('t.o4'), '2026-11-10T09:00:00-05:00', '2026-11-10', '2026-11-10T12:00:00-05:00', '2026-11-10T12:00:00-05:00');
update public.manual_incomes set received_at = '2026-11-12T12:00:00-05:00' where id = current_setting('t.m')::uuid;
update public.orders set status = 'delivered', delivered_at = now() where id = current_setting('t.o5')::uuid;
update public.orders set due_date = current_setting('t.today')::date - 1 where id = current_setting('t.o7')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000014c1');
select public.cancel_order(gen_random_uuid(), current_setting('t.o4')::uuid, 'El cliente canceló', 1200, 'cash');
select tests.logout();
update public.payments set paid_at = '2026-11-11T12:00:00-05:00' where order_id = current_setting('t.o4')::uuid and kind = 'refund';
select tests.login_as('00000000-0000-4000-8000-0000000014c1');

-- El resumen de hoy
select is(public.home_summary(), jsonb_build_object(
  'collectedTodayCents', 2900, 'collectedByMethod', jsonb_build_object('cash', 500, 'yape', 2400, 'plin', 0, 'transfer', 0),
  'deliveredToday', 1, 'toDeliver', 2, 'receivablesCents', 4800, 'cashClosedToday', false),
  'hoy: lo cobrado por medio, los entregados, por entregar (hoy y atrasados), lo que te deben y la caja abierta');
select is((public.home_summary() ->> 'toDeliver')::integer, (public.order_counts() ->> 'toDeliver')::integer,
  'por entregar es el mismo número que el filtro de Pedidos');
select public.close_cash_day(gen_random_uuid(), current_setting('t.today')::date, 0, 0);
select is((public.home_summary() ->> 'cashClosedToday')::boolean, true, 'después de cerrar el día, dice que la caja se cerró');

-- La semana 2 frente a la semana 1 (el mismo largo, termina el día antes)
select set_config('t.w', public.report_summary('2026-11-09', '2026-11-15')::text, true);
select is(current_setting('t.w')::jsonb - 'bars' - 'byMethod', jsonb_build_object(
  'incomeCents', 3100, 'expensesCents', 300, 'profitCents', 2800,
  'previous', jsonb_build_object('incomeCents', 3600, 'expensesCents', 500, 'profitCents', 3100)),
  'ingresos por fecha de pago (con la devolución en su día) menos gastos sin anular, y la semana anterior');
select is(current_setting('t.w')::jsonb -> 'byMethod', '{"cash": 2400, "yape": 0, "plin": 0, "transfer": 700}'::jsonb,
  'lo cobrado por medio de pago');
select is(jsonb_array_length(current_setting('t.w')::jsonb -> 'bars'), 7, 'una semana: una barra por día');
select is(current_setting('t.w')::jsonb -> 'bars' -> 0, '{"from": "2026-11-09", "to": "2026-11-09", "incomeCents": 2400, "expensesCents": 0}'::jsonb,
  'el pago de las 00:30 del lunes cuenta el lunes (y la semana)');
select is(current_setting('t.w')::jsonb -> 'bars' -> 2, '{"from": "2026-11-11", "to": "2026-11-11", "incomeCents": -1200, "expensesCents": 0}'::jsonb,
  'la devolución resta el día en que se devolvió');
select is((public.report_summary('2026-11-08', '2026-11-08') ->> 'incomeCents')::integer, 1200,
  'el pago de las 23:30 del domingo cuenta el domingo, no el lunes');

-- Un mes: barras por semana del mes; un rango largo, por mes
select set_config('t.m30', public.report_summary('2026-11-01', '2026-11-30')::text, true);
select is(array[jsonb_array_length(current_setting('t.m30')::jsonb -> 'bars'), (current_setting('t.m30')::jsonb -> 'bars' -> 1 ->> 'incomeCents')::integer],
  array[5, 4300], 'un mes: del 1 al 7, del 8 al 14… (la segunda con 1200 + 2400 + 1200 − 1200 + 700)');
select is(current_setting('t.m30')::jsonb -> 'bars' -> 4 ->> 'from', '2026-11-29', 'la última semana es la que queda');
select is(array(select e ->> 'from' from jsonb_array_elements(public.report_summary('2026-09-01', '2026-11-30') -> 'bars') as e),
  array['2026-09-01', '2026-10-01', '2026-11-01'], 'un rango largo: una barra por mes');
select throws_ok('select public.report_summary(''2026-11-15'', ''2026-11-09'')', 'P0001', 'invalid', 'el desde no puede ir después del hasta');
select throws_ok('select public.report_summary(''2025-01-01'', ''2026-11-30'')', 'P0001', 'invalid', 'ni pasar de un año');

-- El ranking: los entregados por fecha de entrega, sin anulados
select set_config('t.r', public.report_ranking('2026-11-02', '2026-11-15')::text, true);
select is(current_setting('t.r')::jsonb -> 'products', jsonb_build_array(
  jsonb_build_object('productId', '00000000-0000-4000-8000-000000001401', 'name', 'Coqueta', 'imageUrl', null, 'units', 4,
    'salesCents', 4800, 'costCents', 500, 'profitCents', 2800),
  jsonb_build_object('productId', '00000000-0000-4000-8000-000000001402', 'name', 'Limon Kiss', 'imageUrl', null, 'units', 1,
    'salesCents', 1200, 'costCents', null, 'profitCents', null)),
  'por alfajor: unidades, soles y la ganancia con su costo (sin costo, sin ganancia); el anulado no cuenta');
select is(current_setting('t.r')::jsonb -> 'channels', '{"whatsapp": 2, "local": 1, "web": 0}'::jsonb, 'los pedidos por canal');
select is((current_setting('t.r')::jsonb -> 'topCustomers' -> 0) - 'customerId', '{"name": "Rosa (DEMO)", "orders": 3, "spentCents": 6000}'::jsonb,
  'los clientes que más compran');
select is((select sum((e ->> 'units')::integer)::integer from jsonb_array_elements(public.report_ranking('2026-11-09', '2026-11-15') -> 'products') as e),
  2, 'el entregado y después anulado deja de contar en el ranking');

-- Lo que se exporta: pedidos del periodo, pagos y devoluciones, gastos e ingresos a mano, del más viejo al más nuevo
select set_config('t.x', public.export_rows('2026-11-09', '2026-11-15')::text, true);
select is(array(select e ->> 'kind' from jsonb_array_elements(current_setting('t.x')::jsonb) as e order by 1),
  array['expense', 'income', 'order', 'order', 'payment', 'payment', 'refund'], 'todo lo del periodo, cada cosa con su tipo');
select is((current_setting('t.x')::jsonb -> 0) - 'at', '{"kind": "order", "orderNumber": 3, "customerName": "Rosa (DEMO)", "detail": "2 Coquetas", "method": null, "amountCents": 2400, "status": "delivered"}'::jsonb,
  'del más viejo al más nuevo: primero el pedido #3, creado el lunes a las 00:20');
select is((select e - 'at' from jsonb_array_elements(current_setting('t.x')::jsonb) as e where e ->> 'kind' = 'expense'),
  '{"kind": "expense", "orderNumber": null, "customerName": null, "detail": "Insumos: Cajas", "method": "yape", "amountCents": 300, "status": null}'::jsonb,
  'un gasto con su tipo y en qué');
select throws_ok('select public.export_rows(''2025-01-01'', ''2026-11-30'')', 'P0001', 'invalid', 'hasta un año');

-- Otro negocio
select tests.login_as('00000000-0000-4000-8000-0000000014c2');
select is(public.home_summary() - 'collectedByMethod', '{"collectedTodayCents": 0, "deliveredToday": 0, "toDeliver": 0, "receivablesCents": 0, "cashClosedToday": false}'::jsonb,
  'otro dueño no ve el resumen');
select is(public.report_ranking('2026-11-02', '2026-11-15') -> 'products', '[]'::jsonb, 'ni el ranking');
select is(public.export_rows('2026-11-09', '2026-11-15'), '[]'::jsonb, 'ni lo que se exporta');
select tests.logout();

select * from finish();
