-- Clientes: buscar sin tildes y por teléfono, los filtros, la ficha, corregir y borrar sus datos (docs/spec/customers.md)
select plan(32);

select tests.make_user('00000000-0000-4000-8000-0000000015c1');
select tests.make_user('00000000-0000-4000-8000-0000000015c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000015d1', '00000000-0000-4000-8000-0000000015c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000015d2', '00000000-0000-4000-8000-0000000015c2', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}', delivery_fee_cents = 0, lapsed_after_days = 7
where business_id = '00000000-0000-4000-8000-0000000015d1';
insert into public.products (id, business_id, name, price_cents, min_stock) values
  ('00000000-0000-4000-8000-000000001501', '00000000-0000-4000-8000-0000000015d1', 'Coqueta', 1200, 0),
  ('00000000-0000-4000-8000-000000001502', '00000000-0000-4000-8000-0000000015d1', 'Morenita', 1200, 0);
select set_config('t.today', ((now() at time zone 'America/Lima')::date)::text, true);

create function pg_temp.order_for(p_phone text, p_name text, p_product text, p_quantity integer, p_address text) returns uuid
language sql as $$
  select (public.create_order(gen_random_uuid(), jsonb_build_object(
    'customer', jsonb_build_object('phone', p_phone, 'name', p_name),
    'fulfillment', case when p_address is null then 'pickup' else 'delivery' end,
    'note', 'Tocar el timbre (DEMO)',
    'lines', jsonb_build_array(jsonb_build_object('productId', p_product, 'quantity', p_quantity)))
    || case when p_address is null then '{}'::jsonb else jsonb_build_object('deliveryAddress', p_address) end) ->> 'id')::uuid;
$$;
-- Los nombres de una página, en orden alfabético o en el que llegan
create function pg_temp.names(p_page jsonb) returns text[] language sql as $$
  select array(select e ->> 'name' from jsonb_array_elements(p_page -> 'items') as e order by 1);
$$;
create function pg_temp.in_order(p_page jsonb) returns text[] language sql as $$
  select array(select e ->> 'name' from jsonb_array_elements(p_page -> 'items') as e);
$$;
grant execute on function pg_temp.order_for(text, text, text, integer, text), pg_temp.names(jsonb), pg_temp.in_order(jsonb)
  to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000015c1');
-- Ana: 2 Coquetas y 1 Morenita (S/ 36). Mariana: 1 (S/ 12). Lucía: delivery de 4 (S/ 48). Jorge: 1 (S/ 12), pidió hace
-- 10 días. Rosa: 2 (S/ 24), hace 3 días
select pg_temp.order_for('+51900000501', 'Ana Q. (DEMO)', '00000000-0000-4000-8000-000000001501', 2, null);
select pg_temp.order_for('+51900000501', 'Ana Q. (DEMO)', '00000000-0000-4000-8000-000000001502', 1, null);
select pg_temp.order_for('+51900000502', 'Mariana (DEMO)', '00000000-0000-4000-8000-000000001501', 1, null);
select set_config('t.lucia_order', pg_temp.order_for('+51987654321', 'Lucía R. (DEMO)', '00000000-0000-4000-8000-000000001501', 4,
  'Jr. Lima 412 (DEMO)')::text, true);
select pg_temp.order_for('+51900000504', 'Jorge P. (DEMO)', '00000000-0000-4000-8000-000000001501', 1, null);
select pg_temp.order_for('+51900000505', 'Rosa T. (DEMO)', '00000000-0000-4000-8000-000000001501', 2, null);
select tests.logout();
update public.customers set last_order_at = now() - interval '10 days' where phone = '+51900000504';
update public.customers set last_order_at = now() - interval '3 days' where phone = '+51900000505';
select set_config('t.ana', (select id::text from public.customers where phone = '+51900000501'), true);
select set_config('t.lucia', (select id::text from public.customers where phone = '+51987654321'), true);
select tests.login_as('00000000-0000-4000-8000-0000000015c1');

-- Buscar como escribe la gente
select is((select count(*)::integer from public.customers where phone = '+51900000501'), 1, 'un solo cliente por teléfono');
select is(pg_temp.names(public.search_customers('ana', 'all', 20, null)), array['Ana Q. (DEMO)', 'Mariana (DEMO)'],
  '«ana» encuentra a Ana y a Mariana');
select is(pg_temp.names(public.search_customers('lu', 'all', 20, null)), array['Lucía R. (DEMO)'], '«lu» encuentra a Lucía');
select is(pg_temp.names(public.search_customers(' LUCIA ', 'all', 20, null)), array['Lucía R. (DEMO)'],
  'sin tildes ni mayúsculas');
select is(pg_temp.names(public.search_customers('987 654', 'all', 20, null)), array['Lucía R. (DEMO)'],
  'los dígitos buscan en el teléfono, con espacios');
select is(pg_temp.names(public.search_customers('51-987654321', 'all', 20, null)), array['Lucía R. (DEMO)'],
  'y con el 51 y guiones');
select is(pg_temp.names(public.search_customers('100%', 'all', 20, null)), array[]::text[], '«%» se busca como letra');

-- Los filtros
select is(pg_temp.names(public.search_customers(null, 'lapsed', 20, null)), array['Jorge P. (DEMO)'],
  'No vuelven: con el ajuste de 7 días, el de hace 10 entra y el de hace 3 no');
select is((pg_temp.in_order(public.search_customers(null, 'top', 20, null)))[1:3],
  array['Lucía R. (DEMO)', 'Ana Q. (DEMO)', 'Rosa T. (DEMO)'], 'Los que más compran, por lo gastado');
select is((pg_temp.in_order(public.search_customers(null, 'all', 20, null)))[5], 'Jorge P. (DEMO)',
  'Todos, por su último pedido: el de hace 10 días al final');
select throws_ok('select public.search_customers(null, ''nuevos'', 20, null)', 'P0001', 'invalid', 'un filtro que no existe');

-- Por páginas: cada una sigue donde quedó la anterior, sin repetir
select set_config('t.p1', public.search_customers(null, 'top', 2, null)::text, true);
select is((current_setting('t.p1')::jsonb -> 'meta') - 'nextCursor', '{"limit": 2, "total": 5, "hasMore": true}'::jsonb,
  'la primera página, con el total');
select set_config('t.p2', public.search_customers(null, 'top', 2, current_setting('t.p1')::jsonb -> 'meta' ->> 'nextCursor')::text, true);
select set_config('t.p3', public.search_customers(null, 'top', 2, current_setting('t.p2')::jsonb -> 'meta' ->> 'nextCursor')::text, true);
select is(array[
    jsonb_array_length(current_setting('t.p2')::jsonb -> 'items'),
    jsonb_array_length(current_setting('t.p3')::jsonb -> 'items'),
    (select count(distinct e ->> 'id')::integer from (
      select jsonb_array_elements(current_setting('t.p1')::jsonb -> 'items') as e
      union all select jsonb_array_elements(current_setting('t.p2')::jsonb -> 'items')
      union all select jsonb_array_elements(current_setting('t.p3')::jsonb -> 'items')) as x)],
  array[2, 1, 5], 'las páginas siguientes no repiten a nadie');
select is((current_setting('t.p3')::jsonb -> 'meta' ->> 'hasMore')::boolean, false, 'la última lo dice');

-- La ficha
select is(public.get_customer(current_setting('t.ana')::uuid) - 'id' - 'lastOrderAt' - 'version',
  jsonb_build_object('name', 'Ana Q. (DEMO)', 'phone', '+51900000501', 'address', null, 'note', null,
    'acceptsPromotions', false, 'ordersCount', 2, 'spentCents', 3600, 'stamps', 0,
    'favorite', jsonb_build_object('productId', '00000000-0000-4000-8000-000000001501', 'name', 'Coqueta'), 'anonymizedAt', null),
  'la ficha: sus datos, sus totales y su favorito');
select is((public.find_customer_by_phone('+51900000501') ->> 'stamps')::integer, 0, 'el cliente del teléfono trae sus sellos');
select is(array(select e ->> 'customerName' from jsonb_array_elements(
    public.list_customer_orders(current_setting('t.ana')::uuid, 20, null) -> 'items') as e),
  array['Ana Q. (DEMO)', 'Ana Q. (DEMO)'], 'sus pedidos, solo los suyos');

-- Corregir sus datos
select set_config('t.ana_v', (public.get_customer(current_setting('t.ana')::uuid) ->> 'version'), true);
select is(public.update_customer(current_setting('t.ana')::uuid, current_setting('t.ana_v')::integer, ' Ana Quispe (DEMO) ',
    'Jr. Bellido 210 (DEMO)', '  ', true) - 'id' - 'lastOrderAt' - 'version' - 'favorite',
  jsonb_build_object('name', 'Ana Quispe (DEMO)', 'phone', '+51900000501', 'address', 'Jr. Bellido 210 (DEMO)', 'note', null,
    'acceptsPromotions', true, 'ordersCount', 2, 'spentCents', 3600, 'stamps', 0, 'anonymizedAt', null),
  'corregir: sin espacios de más, y la nota vacía queda sin nota');
select throws_ok(format('select public.update_customer(%L, %s, %L, null, null, false)', current_setting('t.ana'),
  current_setting('t.ana_v'), 'Ana (DEMO)'), 'P0001', 'conflict', 'con otra versión, conflict');
select throws_ok(format('select public.update_customer(%L, %s, %L, null, null, false)', current_setting('t.ana'),
  current_setting('t.ana_v')::integer + 1, '   '), 'P0001', 'invalid', 'sin nombre, invalid');

-- Borrar sus datos (a pedido del cliente, Ley 29733): los números del negocio no cambian
select set_config('t.home', public.home_summary()::text, true);
select set_config('t.report', public.report_summary(current_setting('t.today')::date, current_setting('t.today')::date)::text, true);
select set_config('t.erased', public.anonymize_customer(current_setting('t.lucia')::uuid)::text, true);
select is(current_setting('t.erased')::jsonb - 'id' - 'lastOrderAt' - 'version' - 'favorite' - 'anonymizedAt',
  jsonb_build_object('name', 'Cliente eliminado', 'phone', null, 'address', null, 'note', null, 'acceptsPromotions', false,
    'ordersCount', 1, 'spentCents', 4800, 'stamps', 0),
  'sin nombre, teléfono, dirección ni nota; sus totales quedan');
select is((select array[o.customer_name, o.delivery_address, coalesce(o.note, '')] from public.orders o
    where o.id = current_setting('t.lucia_order')::uuid),
  array['Cliente eliminado', 'Dirección eliminada', ''], 'sus pedidos quedan sin su nombre, su dirección ni su nota');
select is((select count(*)::integer from jsonb_array_elements(public.export_rows(current_setting('t.today')::date,
    current_setting('t.today')::date)) as e where e::text ~ '(Lucía|987654321|Jr\. Lima|timbre)' and e ->> 'orderNumber' = '4'),
  0, 'tampoco en lo que se exporta');
select is(public.home_summary(), current_setting('t.home')::jsonb, 'Inicio no cambia');
select is(public.report_summary(current_setting('t.today')::date, current_setting('t.today')::date),
  current_setting('t.report')::jsonb, 'ni los reportes');
select is(pg_temp.names(public.search_customers('lucia', 'all', 20, null)), array[]::text[], 'ya no se encuentra');
select is(public.anonymize_customer(current_setting('t.lucia')::uuid) ->> 'anonymizedAt',
  current_setting('t.erased')::jsonb ->> 'anonymizedAt', 'borrar otra vez devuelve lo mismo');
select throws_ok(format('select public.update_customer(%L, %s, %L, null, null, false)', current_setting('t.lucia'),
  current_setting('t.erased')::jsonb ->> 'version', 'Lucía (DEMO)'), 'P0001', 'invalid', 'un cliente borrado no se corrige');
select set_config('t.again', pg_temp.order_for('+51987654321', 'Lucía R. (DEMO)', '00000000-0000-4000-8000-000000001501', 1,
  null)::text, true);
select isnt(public.get_order(current_setting('t.again')::uuid) ->> 'customerId', current_setting('t.lucia'),
  'el mismo teléfono vuelve a pedir como cliente nuevo');

-- Otro negocio
select tests.login_as('00000000-0000-4000-8000-0000000015c2');
select is(public.search_customers(null, 'all', 20, null) -> 'items', '[]'::jsonb, 'otro dueño no ve los clientes');
select throws_ok(format('select public.get_customer(%L)', current_setting('t.ana')), 'P0001', 'not_found', 'ni la ficha');
select throws_ok(format('select public.anonymize_customer(%L)', current_setting('t.ana')), 'P0001', 'not_found',
  'ni puede borrarlos');
select tests.logout();

select * from finish();
