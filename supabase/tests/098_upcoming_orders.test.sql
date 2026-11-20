-- Los pedidos que vienen, del más próximo al más lejano: los usan los recordatorios del celular (docs/spec/reminders.md)
select plan(6);

select tests.make_user('00000000-0000-4000-8000-0000000019c1');
select tests.make_user('00000000-0000-4000-8000-0000000019c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000019d1', '00000000-0000-4000-8000-0000000019c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000019d2', '00000000-0000-4000-8000-0000000019c2', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents) values
  ('00000000-0000-4000-8000-0000000019a1', '00000000-0000-4000-8000-0000000019d1', 'Coqueta', 1200);

-- Un pedido para dentro de p_days días (0 = hoy), a nombre de p_name
create function pg_temp.order_in(p_days integer, p_name text) returns uuid language sql as $$
  select (public.create_order(gen_random_uuid(), jsonb_build_object(
    'customer', jsonb_build_object('phone', '+5190000' || lpad((1900 + p_days)::text, 4, '0'), 'name', p_name),
    'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-0000000019a1', 'quantity', 1)))
    || case when p_days = 0 then '{}'::jsonb
       else jsonb_build_object('scheduledFor', ((now() at time zone 'America/Lima')::date + p_days)::text) end) ->> 'id')::uuid;
$$;
create function pg_temp.names(p_limit integer default 50) returns text[] language sql as $$
  select coalesce(array_agg(e ->> 'customerName' order by n), '{}')
  from jsonb_array_elements(public.upcoming_orders(p_limit) -> 'items') with ordinality as x (e, n);
$$;
grant execute on function pg_temp.order_in(integer, text) to authenticated;
grant execute on function pg_temp.names(integer) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000019c1');
-- Anotados en otro orden que su día: el número no manda
select pg_temp.order_in(3, 'En 3 días (DEMO)');
select pg_temp.order_in(1, 'Mañana (DEMO)');
select pg_temp.order_in(0, 'Hoy (DEMO)');
select pg_temp.order_in(2, 'En 2 días (DEMO)');
select set_config('t.cancelled', pg_temp.order_in(1, 'Anulado (DEMO)')::text, true);
select set_config('t.delivered', pg_temp.order_in(2, 'Entregado (DEMO)')::text, true);
select tests.logout();
update public.orders set status = 'cancelled', cancel_reason = 'Prueba (DEMO)' where id = current_setting('t.cancelled')::uuid;
update public.orders set status = 'delivered', delivered_at = now() where id = current_setting('t.delivered')::uuid;

select tests.login_as('00000000-0000-4000-8000-0000000019c1');
select is(pg_temp.names(), '{"Mañana (DEMO)","En 2 días (DEMO)","En 3 días (DEMO)"}',
  'de mañana en adelante, del más próximo al más lejano, sin hoy, sin anulados ni entregados');
select is(pg_temp.names(2), '{"Mañana (DEMO)","En 2 días (DEMO)"}', 'con un límite, los más próximos');
select is((select array_agg(k order by k) from jsonb_object_keys(public.upcoming_orders(1) -> 'items' -> 0) as k),
  '{customerName,dueDate,fulfillment,id,itemsSummary,number,paidCents,promisedAt,status,totalCents}',
  'cada uno con la misma forma que una fila de list_orders');
select throws_ok('select public.upcoming_orders(0)', 'P0001', 'invalid', 'un límite de 0 no vale');
select tests.logout();

select tests.login_as('00000000-0000-4000-8000-0000000019c2');
select is(pg_temp.names(), '{}', 'otro negocio no ve ninguno');
select tests.logout();
select ok(has_function_privilege('anon', 'public.upcoming_orders(integer)', 'execute') is false, 'sin sesión no se puede');

select * from finish();
