-- Cuadre de caja: lo cobrado y lo gastado en efectivo de un día de Lima, los otros medios, cerrar el día y volver a
-- contar (docs/spec/cash.md)
select plan(16);

select tests.make_user('00000000-0000-4000-8000-0000000013c1');
select tests.make_user('00000000-0000-4000-8000-0000000013c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000013d1', '00000000-0000-4000-8000-0000000013c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000013d2', '00000000-0000-4000-8000-0000000013c2', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape,plin,transfer}', delivery_fee_cents = 0
where business_id = '00000000-0000-4000-8000-0000000013d1';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-0000000013d1', 'Coqueta', 1200, 0);
select set_config('t.today', ((now() at time zone 'America/Lima')::date)::text, true);
select set_config('t.yesterday', ((now() at time zone 'America/Lima')::date - 1)::text, true);

create function pg_temp.order_with(p_method text, p_cents integer) returns uuid language sql as $$
  select (public.create_order(gen_random_uuid(), jsonb_build_object(
    'customer', jsonb_build_object('phone', '+51900000995', 'name', 'Rosa (DEMO)'), 'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-000000001301', 'quantity', 2)),
    'payment', jsonb_build_object('method', p_method, 'amountCents', p_cents))) ->> 'id')::uuid;
$$;
grant execute on function pg_temp.order_with(text, integer) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000013c1');
select set_config('t.cat', public.save_expense_category(null, null, 'Insumos', 'basket-outline') ->> 'id', true);
-- Hoy: #1 efectivo 2400; #2 Yape 2400; #3 efectivo 2000 cambiado a Plin; #4 efectivo 2400 anulado con la devolución en
-- efectivo; S/ 15 en efectivo y S/ 10 por transferencia a mano; un gasto en efectivo de 45, uno por Yape de 30 y uno en
-- efectivo anulado. Ayer: #5 efectivo 2400. El 10 de noviembre a las 23:30 de Lima: un gasto en efectivo de 13
select pg_temp.order_with('cash', 2400);
select pg_temp.order_with('yape', 2400);
select set_config('t.o3', pg_temp.order_with('cash', 2000)::text, true);
select public.change_payment_method(gen_random_uuid(), (select p.id from public.payments p where p.order_id = current_setting('t.o3')::uuid), 'plin');
select set_config('t.o4', pg_temp.order_with('cash', 2400)::text, true);
select public.cancel_order(gen_random_uuid(), current_setting('t.o4')::uuid, 'El cliente canceló', 2400, 'cash');
select set_config('t.o5', pg_temp.order_with('cash', 2400)::text, true);
select public.create_manual_income(gen_random_uuid(), 'Venta a un café (DEMO)', 1500, 'cash', null);
select public.create_manual_income(gen_random_uuid(), 'Evento (DEMO)', 1000, 'transfer', null);
select public.create_expense(gen_random_uuid(), current_setting('t.cat')::uuid, 4500, 'cash', 'Cajas', null);
select public.create_expense(gen_random_uuid(), current_setting('t.cat')::uuid, 3000, 'yape', 'Chocolate', null);
select public.void_expense((public.create_expense(gen_random_uuid(), current_setting('t.cat')::uuid, 999, 'cash', 'Error', null) ->> 'id')::uuid,
  'Anotado dos veces');
select public.create_expense(gen_random_uuid(), current_setting('t.cat')::uuid, 1300, 'cash', null, '2026-11-10T23:30:00-05:00');
select tests.logout();
update public.payments set paid_at = (current_setting('t.yesterday')::date + time '10:00') at time zone 'America/Lima'
where order_id = current_setting('t.o5')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000013c1');

-- Lo que debería haber: entra 2400 + 2400 + 1500 en efectivo; sale el gasto de 45 y la devolución de 24
select is(public.cash_expected(current_setting('t.today')::date), jsonb_build_object(
  'businessDate', current_setting('t.today'), 'cashInCents', 6300, 'cashOutCents', 6900,
  'otherMethods', jsonb_build_object('yape', 2400, 'plin', 2000, 'transfer', 1000), 'lastOpeningCents', 0),
  'solo el efectivo sin anular de ese día, con los otros medios aparte (el pago cambiado a Plin no es efectivo)');
select is((public.cash_expected('2026-11-10') ->> 'cashOutCents')::integer, 1300, 'un gasto a las 23:30 de Lima cuenta ese día');
select is((public.cash_expected('2026-11-11') ->> 'cashOutCents')::integer, 0, 'y no el siguiente');
select is((public.cash_expected(current_setting('t.yesterday')::date) ->> 'cashInCents')::integer, 2400, 'el pago de ayer cuenta ayer');

-- Cerrar el día: la base hace la cuenta con lo de ese momento
select set_config('t.c1', public.close_cash_day('00000000-0000-4000-8000-0000000013e1', current_setting('t.today')::date, 5000, 4200)::text, true);
select is(current_setting('t.c1')::jsonb - 'id' - 'closedAt', jsonb_build_object(
  'businessDate', current_setting('t.today'), 'openingCents', 5000, 'cashInCents', 6300, 'cashOutCents', 6900,
  'expectedCents', 4400, 'countedCents', 4200, 'differenceCents', -200), 'debería haber 5000 + 6300 − 6900; faltan 2');
select is(public.close_cash_day('00000000-0000-4000-8000-0000000013e1', current_setting('t.today')::date, 5000, 4200) ->> 'id',
  current_setting('t.c1')::jsonb ->> 'id', 'el mismo código cierra una vez');
select throws_ok(format('select public.close_cash_day(%L, %L, 5000, 4400)', '00000000-0000-4000-8000-0000000013e1', current_setting('t.today')),
  'P0001', 'conflict', 'con otros datos, conflict');
select is(public.latest_cash_count(current_setting('t.today')::date) ->> 'id', current_setting('t.c1')::jsonb ->> 'id', 'el cierre del día');

-- Volver a contar crea otro cierre, y manda el último
select set_config('t.c2', public.close_cash_day(gen_random_uuid(), current_setting('t.today')::date, 5000, 4400)::text, true);
select is(public.latest_cash_count(current_setting('t.today')::date) ->> 'differenceCents', '0', 'manda el último conteo');
select is((select count(*)::integer from public.cash_counts c where c.business_id = '00000000-0000-4000-8000-0000000013d1'), 2,
  'y los dos quedan guardados');
select throws_ok(format('select public.close_cash_day(gen_random_uuid(), %L, 5000, 4400)', current_setting('t.today')::date + 1),
  'P0001', 'invalid', 'un día que no llegó no se cierra');
select throws_ok(format('select public.close_cash_day(gen_random_uuid(), %L, -1, 4400)', current_setting('t.today')),
  'P0001', 'invalid', 'ni con montos negativos');

-- «Abriste con» por defecto: con cuánto abrió el último cierre de un día anterior
select public.close_cash_day(gen_random_uuid(), current_setting('t.yesterday')::date, 3000, 8000);
select is((public.cash_expected(current_setting('t.today')::date + 1) ->> 'lastOpeningCents')::integer, 5000,
  'mañana sugiere con cuánto se abrió hoy');
select is((public.cash_expected(current_setting('t.today')::date) ->> 'lastOpeningCents')::integer, 3000,
  'hoy, con cuánto se abrió ayer');

-- Otro negocio
select tests.login_as('00000000-0000-4000-8000-0000000013c2');
select is(public.latest_cash_count(current_setting('t.today')::date), null, 'otro dueño no ve los cierres');
select is((public.cash_expected(current_setting('t.today')::date) ->> 'cashInCents')::integer, 0, 'ni lo cobrado');
select tests.logout();

select * from finish();
