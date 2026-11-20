-- Fidelidad: la tarjeta de sellos, que se suman una sola vez, el canje y su anulación (docs/spec/loyalty.md)
select plan(32);

select tests.make_user('00000000-0000-4000-8000-0000000016c1');
select tests.make_user('00000000-0000-4000-8000-0000000016c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000016d1', '00000000-0000-4000-8000-0000000016c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000016d2', '00000000-0000-4000-8000-0000000016c2', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}', delivery_fee_cents = 0
where business_id = '00000000-0000-4000-8000-0000000016d1';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000001601', '00000000-0000-4000-8000-0000000016d1', 'Coqueta', 1200, 0),
  ('00000000-0000-4000-8000-000000001605', '00000000-0000-4000-8000-0000000016d1', 'Pipo Crush', 1300, 0);

-- Un pedido de Ana (o de quien se pida) a recoger, con sus líneas; con el premio si se pide
create function pg_temp.order_for(p_phone text, p_coquetas integer, p_redeem boolean default false, p_discount integer default 0)
returns uuid language sql as $$
  select (public.create_order(gen_random_uuid(), jsonb_build_object(
    'customer', jsonb_build_object('phone', p_phone, 'name', 'Cliente (DEMO)'), 'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-000000001601', 'quantity', p_coquetas)))
    || case when p_redeem then jsonb_build_object('redeemReward', true) else '{}'::jsonb end
    || case when p_discount > 0 then jsonb_build_object('discountCents', p_discount, 'discountReason', 'Cumpleaños') else '{}'::jsonb end
  ) ->> 'id')::uuid;
$$;
-- Lo lleva hasta entregado: nuevo → preparando → listo → entregado
create function pg_temp.deliver(p_order uuid) returns void language sql as $$
  select public.advance_order(p_order, 'new');
  select public.advance_order(p_order, 'preparing');
  select public.advance_order(p_order, 'ready');
$$;
create function pg_temp.stamps(p_phone text) returns integer language sql as $$
  select c.stamps from public.customers c where c.phone = p_phone;
$$;
-- La regla de oro: los sellos de cada cliente son la suma de sus movimientos
create function pg_temp.ledger_ok() returns boolean language sql as $$
  select not exists (
    select 1 from public.customers c
    where c.stamps <> (select coalesce(sum(s.delta), 0) from public.loyalty_stamps s where s.customer_id = c.id)
  );
$$;
create function pg_temp.settings(p_active boolean, p_unit text, p_goal integer, p_kind text default 'free_item',
  p_amount integer default null, p_text text default null) returns jsonb language sql as $$
  select public.update_loyalty_settings((public.get_loyalty_settings() ->> 'version')::integer, p_active, p_unit, p_goal, p_kind,
    p_amount, p_text);
$$;
grant execute on function pg_temp.order_for(text, integer, boolean, integer), pg_temp.deliver(uuid), pg_temp.stamps(text),
  pg_temp.ledger_ok(), pg_temp.settings(boolean, text, integer, text, integer, text) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000016c1');
-- Apagada, con la regla de ejemplo (PROJECT_CONTEXT §7)
select is(public.get_loyalty_settings() - 'version', '{"isActive": false, "stampUnit": "order", "goal": 10,
  "rewardKind": "free_item", "rewardAmountCents": null, "rewardText": null}'::jsonb, 'nace apagada, con la regla de ejemplo');
select set_config('t.o1', pg_temp.order_for('+51900000601', 1)::text, true);
select pg_temp.deliver(current_setting('t.o1')::uuid);
select is(pg_temp.stamps('+51900000601'), 0, 'apagada, entregar no suma');

-- Encenderla
select is(pg_temp.settings(true, 'order', 3) - 'version', '{"isActive": true, "stampUnit": "order", "goal": 3,
  "rewardKind": "free_item", "rewardAmountCents": null, "rewardText": null}'::jsonb, 'encendida: 3 compras, 1 alfajor gratis');
select throws_ok('select pg_temp.settings(true, ''order'', 31)', 'P0001', 'invalid', 'por compra, hasta 30');
select throws_ok('select pg_temp.settings(true, ''item'', 4)', 'P0001', 'invalid', 'por alfajor, desde 5');
select throws_ok('select pg_temp.settings(true, ''order'', 3, ''discount'')', 'P0001', 'invalid', 'un descuento necesita su monto');
select throws_ok('select pg_temp.settings(true, ''order'', 3, ''other'', null, ''  '')', 'P0001', 'invalid',
  'otro premio necesita su texto');
select throws_ok('select public.update_loyalty_settings(1, true, ''order'', 5, ''free_item'', null, null)', 'P0001', 'conflict',
  'con otra versión, conflict');

-- Sumar una sola vez
select set_config('t.o2', pg_temp.order_for('+51900000601', 1)::text, true);
select pg_temp.deliver(current_setting('t.o2')::uuid);
select is(pg_temp.stamps('+51900000601'), 1, 'entregar suma 1');
select throws_ok(format('select public.advance_order(%L, %L)', current_setting('t.o2'), 'ready'), 'P0001', 'conflict',
  'un segundo toque no vuelve a entregar');
select public.revert_status(current_setting('t.o2')::uuid, 'delivered');
select is(pg_temp.stamps('+51900000601'), 0, 'deshacer la entrega quita el sello');
select public.advance_order(current_setting('t.o2')::uuid, 'ready');
select is(pg_temp.stamps('+51900000601'), 1, 'entregar, deshacer y volver a entregar deja uno solo');
select set_config('t.o3', pg_temp.order_for('+51900000601', 1)::text, true);
select pg_temp.deliver(current_setting('t.o3')::uuid);
select public.cancel_order(gen_random_uuid(), current_setting('t.o3')::uuid, 'Se equivocó (DEMO)', 0, null);
select is(pg_temp.stamps('+51900000601'), 1, 'anular un entregado quita lo que sumó');

-- Por alfajor
select pg_temp.settings(true, 'item', 5);
select pg_temp.deliver(pg_temp.order_for('+51900000602', 3));
select is(pg_temp.stamps('+51900000602'), 3, 'por alfajor, un pedido de 3 alfajores suma 3');

-- El canje: 3 compras, 1 alfajor gratis
select pg_temp.settings(true, 'order', 3);
select pg_temp.deliver(pg_temp.order_for('+51900000601', 1));
select pg_temp.deliver(pg_temp.order_for('+51900000601', 1));
select is(pg_temp.stamps('+51900000601'), 3, 'con 3 sellos, el premio está listo');
select throws_ok('select pg_temp.order_for(''+51900000601'', 2, true, 500)', 'P0001', 'invalid',
  'con el premio no va otro descuento');
select set_config('t.redeemed', public.create_order(gen_random_uuid(), jsonb_build_object(
  'customer', jsonb_build_object('phone', '+51900000601'), 'fulfillment', 'pickup', 'redeemReward', true,
  'lines', jsonb_build_array(
    jsonb_build_object('productId', '00000000-0000-4000-8000-000000001601', 'quantity', 2),
    jsonb_build_object('productId', '00000000-0000-4000-8000-000000001605', 'quantity', 1))))::text, true);
select is(array[(current_setting('t.redeemed')::jsonb ->> 'discountCents'), current_setting('t.redeemed')::jsonb ->> 'discountReason',
    (current_setting('t.redeemed')::jsonb ->> 'totalCents')],
  array['1200', 'Fidelidad', '2500'], 'canjear: el alfajor más barato gratis (2 Coquetas a S/ 12 y 1 Pipo Crush a S/ 13 → S/ 12)');
select is(pg_temp.stamps('+51900000601'), 0, 'canjear resta la meta');
select is((current_setting('t.redeemed')::jsonb -> 'customer' ->> 'stamps')::integer, 0, 'el pedido trae los sellos de su cliente');
select throws_ok('select pg_temp.order_for(''+51900000601'', 1, true)', 'P0001', 'invalid', 'sin sellos suficientes, no se canjea');
select throws_ok('select pg_temp.order_for(''+51900000609'', 1, true)', 'P0001', 'invalid', 'un cliente nuevo tampoco');

-- Anular el canjeado devuelve los sellos; deshacer la anulación los vuelve a canjear
select public.cancel_order(gen_random_uuid(), (current_setting('t.redeemed')::jsonb ->> 'id')::uuid, 'Lo pidió dos veces (DEMO)', 0, null);
select is(pg_temp.stamps('+51900000601'), 3, 'anular el pedido canjeado devuelve los sellos');
select public.revert_cancel((current_setting('t.redeemed')::jsonb ->> 'id')::uuid);
select is(pg_temp.stamps('+51900000601'), 0, 'deshacer la anulación los vuelve a canjear');
select public.cancel_order(gen_random_uuid(), (current_setting('t.redeemed')::jsonb ->> 'id')::uuid, 'Ahora sí (DEMO)', 0, null);
select pg_temp.order_for('+51900000601', 1, true);
select throws_ok(format('select public.revert_cancel(%L)', current_setting('t.redeemed')::jsonb ->> 'id'), 'P0001', 'conflict',
  'si ya usó esos sellos en otro canje, la anulación no se deshace');

-- Anular un entregado cuyos sellos ya se canjearon no deja sellos negativos
select public.cancel_order(gen_random_uuid(), current_setting('t.o2')::uuid, 'Error (DEMO)', 0, null);
select is(pg_temp.stamps('+51900000601'), 0, 'nunca menos de 0');
select ok(pg_temp.ledger_ok(), 'los sellos de cada cliente son la suma de sus movimientos');

-- Cerca del premio y apagarla
select pg_temp.deliver(pg_temp.order_for('+51900000603', 1));
select pg_temp.deliver(pg_temp.order_for('+51900000603', 1));
select is(public.loyalty_overview(10) -> 'customers' -> 0 ->> 'stamps', '3', 'cerca del premio: el de más sellos primero');
select is(jsonb_array_length(public.loyalty_overview(10) -> 'customers'), 2, 'solo los que tienen la meta − 2 o más');
select pg_temp.settings(false, 'order', 3);
select pg_temp.deliver(pg_temp.order_for('+51900000603', 1));
select is(pg_temp.stamps('+51900000603'), 2, 'apagada otra vez, no suma');
select tests.logout();
select ok((select count(*) from private.audit_log a where a.table_name = 'loyalty_settings'
  and a.business_id = '00000000-0000-4000-8000-0000000016d1') >= 4, 'cada cambio queda en el registro');

-- Otro negocio
select tests.login_as('00000000-0000-4000-8000-0000000016c2');
select is(public.get_loyalty_settings() ->> 'isActive', 'false', 'otro dueño ve la suya, apagada');
select is(public.loyalty_overview(10) -> 'customers', '[]'::jsonb, 'y a nadie cerca del premio');
select tests.logout();

select * from finish();
