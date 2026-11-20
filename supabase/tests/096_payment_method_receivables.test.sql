-- Cambiar el medio de un pago o de una devolución (se anula y se crea otro igual con el medio correcto) y Por cobrar
select plan(17);

select tests.make_user('00000000-0000-4000-8000-0000000009c3');
select tests.make_user('00000000-0000-4000-8000-0000000009c4');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009d3', '00000000-0000-4000-8000-0000000009c3', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009d4', '00000000-0000-4000-8000-0000000009c4', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}', delivery_fee_cents = 0
where business_id = '00000000-0000-4000-8000-0000000009d3';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000000d01', '00000000-0000-4000-8000-0000000009d3', 'Coqueta', 1200, 2);

create function pg_temp.draft(p_changes jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('customer', jsonb_build_object('phone', '+51900000993', 'name', 'Rosa (DEMO)'), 'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-000000000d01', 'quantity', 2))) || p_changes;
$$;
create function pg_temp.by_method(p_method text) returns integer language sql as $$
  select coalesce(sum(p.amount_cents), 0)::integer from public.payments p
  where p.business_id = '00000000-0000-4000-8000-0000000009d3' and p.kind = 'payment' and p.voided_at is null and p.method = p_method;
$$;
grant execute on function pg_temp.draft(jsonb), pg_temp.by_method(text) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000009c3');
select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000d01", "quantity": 30}]');
-- #1 con un adelanto de S/ 20 en efectivo; #2 sin pagar; #3 entregado sin pagar; #4 pagado entero; #5 anulado con saldo
select set_config('t.o1', public.create_order(gen_random_uuid(), pg_temp.draft('{"payment": {"method": "cash", "amountCents": 2000}}')) ->> 'id', true);
select set_config('t.o2', public.create_order(gen_random_uuid(), pg_temp.draft()) ->> 'id', true);
select set_config('t.o3', public.create_order(gen_random_uuid(), pg_temp.draft()) ->> 'id', true);
select public.advance_order(current_setting('t.o3')::uuid, 'new');
select public.advance_order(current_setting('t.o3')::uuid, 'preparing');
select public.advance_order(current_setting('t.o3')::uuid, 'ready');
select set_config('t.o4', public.create_order(gen_random_uuid(), pg_temp.draft('{"payment": {"method": "cash", "amountCents": 2400}}')) ->> 'id', true);
select set_config('t.o5', public.create_order(gen_random_uuid(), pg_temp.draft()) ->> 'id', true);
select public.cancel_order(gen_random_uuid(), current_setting('t.o5')::uuid, 'Sin stock', null, null);

-- Cambiar el medio del adelanto: de efectivo a Yape
select set_config('t.pay', (select p.id::text from public.payments p where p.order_id = current_setting('t.o1')::uuid), true);
select set_config('t.c', public.change_payment_method('00000000-0000-4000-8000-00000000e601', current_setting('t.pay')::uuid, 'yape')::text, true);
select is((select array[p.void_reason, p.method::text] from public.payments p where p.id = current_setting('t.pay')::uuid),
  array['cambio de medio de pago', 'cash'], 'el pago viejo queda anulado, con su motivo');
select is((select count(*)::integer from public.payments p where p.order_id = current_setting('t.o1')::uuid and p.voided_at is null
  and p.method = 'yape' and p.amount_cents = 2000
  and p.paid_at = (select q.paid_at from public.payments q where q.id = current_setting('t.pay')::uuid)), 1,
  'y hay uno nuevo con el mismo monto, la misma fecha y el medio correcto');
select is((current_setting('t.c')::jsonb ->> 'paidCents')::integer, 2000, 'lo pagado del pedido no cambia');
select is(array[pg_temp.by_method('cash'), pg_temp.by_method('yape')], array[2400, 2000], 'lo cobrado por medio ese día sí');
select is((select count(*)::integer from public.payments p where p.order_id = current_setting('t.o1')::uuid), (
  select jsonb_array_length(public.change_payment_method('00000000-0000-4000-8000-00000000e601', current_setting('t.pay')::uuid, 'yape') -> 'payments')),
  'el mismo código dos veces cambia una vez');
select throws_ok(format('select public.change_payment_method(gen_random_uuid(), %L, %L)', current_setting('t.pay'), 'cash'),
  'P0001', 'invalid', 'un pago ya anulado no se cambia');
select throws_ok(format('select public.change_payment_method(gen_random_uuid(), %L, %L)',
  (select p.id from public.payments p where p.order_id = current_setting('t.o4')::uuid), 'cash'), 'P0001', 'invalid', 'ni al mismo medio');
select throws_ok(format('select public.change_payment_method(gen_random_uuid(), %L, %L)',
  (select p.id from public.payments p where p.order_id = current_setting('t.o4')::uuid), 'plin'), 'P0001', 'invalid', 'ni a uno apagado');
select throws_ok('select public.change_payment_method(gen_random_uuid(), gen_random_uuid(), ''yape'')', 'P0001', 'not_found', 'un pago que no existe');
select public.cancel_order(gen_random_uuid(), current_setting('t.o4')::uuid, 'El cliente canceló', 2400, 'cash');
select is((public.change_payment_method(gen_random_uuid(),
  (select p.id from public.payments p where p.order_id = current_setting('t.o4')::uuid and p.kind = 'refund'), 'yape')
  -> 'payments') @> '[{"kind": "refund", "method": "yape", "amountCents": 2400, "voidedAt": null}]', true, 'una devolución también se corrige');

-- Por cobrar: con saldo y sin anular, del número mayor al menor
select set_config('t.r', public.list_receivables()::text, true);
select is(array(select (e ->> 'number')::integer from jsonb_array_elements(current_setting('t.r')::jsonb -> 'items') as e), array[3, 2, 1],
  'solo los que tienen saldo y no están anulados, del mayor al menor');
select is(array(select (e ->> 'remind')::boolean from jsonb_array_elements(current_setting('t.r')::jsonb -> 'items') as e), array[true, false, true],
  'se recuerda si ya se entregó o si hay un adelanto');
select is((current_setting('t.r')::jsonb -> 'meta' ->> 'totalDueCents')::integer, 2400 + 2400 + 400, 'cuánto le deben en total');
select is(current_setting('t.r')::jsonb -> 'items' -> 0 ->> 'customerPhone', '+51900000993', 'con el teléfono para recordarle');
select set_config('t.p1', public.list_receivables(2)::text, true);
select is((current_setting('t.p1')::jsonb -> 'meta') - 'nextCursor', '{"limit": 2, "total": 3, "hasMore": true, "totalDueCents": 5200}'::jsonb,
  'por páginas, con el total');
select is(array(select (e ->> 'number')::integer from jsonb_array_elements(public.list_receivables(2, current_setting('t.p1')::jsonb -> 'meta' ->> 'nextCursor') -> 'items') as e),
  array[1], 'la página siguiente sigue donde quedó');

select tests.login_as('00000000-0000-4000-8000-0000000009c4');
select is((public.list_receivables() -> 'meta' ->> 'total')::integer, 0, 'otro dueño no ve los saldos');
select tests.logout();

select * from finish();
