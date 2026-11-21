-- Leer pedidos: los filtros por el día de Lima, la búsqueda, las páginas, el cliente por teléfono y las plantillas
select plan(29);

select tests.make_user('00000000-0000-4000-8000-0000000009a3');
select tests.make_user('00000000-0000-4000-8000-0000000009a4');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b3', '00000000-0000-4000-8000-0000000009a3', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009b4', '00000000-0000-4000-8000-0000000009a4', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents) values
  ('00000000-0000-4000-8000-000000000a11', '00000000-0000-4000-8000-0000000009b3', 'Coqueta', 1200);

create function pg_temp.draft(p_phone text, p_name text, p_changes jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    'customer', jsonb_build_object('phone', p_phone, 'name', p_name), 'channel', 'whatsapp', 'fulfillment', 'pickup',
    'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-000000000a11', 'quantity', 2))) || p_changes;
$$;
-- Los números de un filtro, del mayor al menor
create function pg_temp.numbers(p_filter text, p_search text default null) returns integer[] language sql as $$
  select coalesce(array_agg((e ->> 'number')::integer order by (e ->> 'number')::integer desc), '{}')
  from jsonb_array_elements(public.list_orders(p_filter, p_search, 50) -> 'items') as e;
$$;
grant execute on function pg_temp.draft(text, text, jsonb) to authenticated;
grant execute on function pg_temp.numbers(text, text) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000009a3');
select set_config('t.ana', public.create_order(gen_random_uuid(), pg_temp.draft('+51900000991', 'Ana (DEMO)')) ->> 'id', true);
select set_config('t.later', public.create_order(gen_random_uuid(), pg_temp.draft('+51900000992', 'Luis (DEMO)',
  jsonb_build_object('scheduledFor', ((now() at time zone 'America/Lima')::date + 3)::text))) ->> 'id', true);

-- El día de cada pedido
select is(pg_temp.numbers('upcoming'), array[2], 'un pedido para otro día sale en «Próximos»');
select is(pg_temp.numbers('today'), array[1], 'y no en «Hoy»');
select tests.logout();
update public.orders set due_date = (now() at time zone 'America/Lima')::date where id = current_setting('t.later')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009a3');
select is(pg_temp.numbers('today'), array[2, 1], 'llegado su día, pasa a «Hoy»');
select is(pg_temp.numbers('to_deliver'), array[2, 1], 'y a «Por entregar»');
select public.advance_order(current_setting('t.ana')::uuid, 'new');
select public.advance_order(current_setting('t.ana')::uuid, 'preparing');
select public.advance_order(current_setting('t.ana')::uuid, 'ready');
select is(pg_temp.numbers('to_deliver'), array[2], 'lo entregado sale de «Por entregar»');
select is(pg_temp.numbers('today'), array[2, 1], 'y sigue en «Hoy», con los terminados');
select tests.logout();
update public.orders set due_date = (now() at time zone 'America/Lima')::date - 1 where id in (current_setting('t.later')::uuid, current_setting('t.ana')::uuid);
select tests.login_as('00000000-0000-4000-8000-0000000009a3');
select is(pg_temp.numbers('today'), array[2], 'al día siguiente, el que nadie entregó sigue en «Hoy» (atrasado) y el entregado ya no');
select is(pg_temp.numbers('upcoming'), '{}'::integer[], 'y ya no está en «Próximos»');
select is((public.order_counts() ->> 'toDeliver')::integer, cardinality(pg_temp.numbers('to_deliver')), '«Por entregar» y su cantidad coinciden');
select is(public.order_counts(), '{"today": 1, "toDeliver": 1, "upcoming": 0, "toCollect": 2, "all": 2}'::jsonb, 'las cantidades de cada filtro');

-- La búsqueda
select is(pg_temp.numbers('all', '#0002'), array[2], 'busca «#0002» por número');
select is(pg_temp.numbers('all', '2'), array[2], 'y «2» también');
select is(pg_temp.numbers('all', 'ana'), array[1], 'y «ana» por nombre, sin importar mayúsculas');
select is(pg_temp.numbers('all', '%'), '{}'::integer[], 'un «%» se busca como letra, no como comodín');

-- Un pedido
select is((public.get_order(current_setting('t.ana')::uuid) ->> 'number')::integer, 1, 'un pedido, con todos sus datos');
select throws_ok('select public.get_order(gen_random_uuid())', 'P0001', 'not_found', 'un pedido que no existe');

-- El cliente por teléfono, con su último pedido sin anular
select set_config('t.cancelled', public.create_order(gen_random_uuid(), pg_temp.draft('+51900000991', 'Ana (DEMO)',
  '{"lines": [{"productId": "00000000-0000-4000-8000-000000000a11", "quantity": 5}]}')) ->> 'id', true);
select tests.logout();
update public.orders set status = 'cancelled', cancel_reason = 'prueba' where id = current_setting('t.cancelled')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009a3');
select is(public.find_customer_by_phone('+51900000991') ->> 'name', 'Ana (DEMO)', 'el cliente por su teléfono');
select is(public.find_customer_by_phone('+51900000991') -> 'lastOrder',
  '{"lines": [{"productId": "00000000-0000-4000-8000-000000000a11", "quantity": 2}]}'::jsonb, 'con su último pedido sin anular');
select is(public.find_customer_by_phone('+51900000999'), null, 'un teléfono nuevo no trae a nadie');

-- Las páginas (#4 a #26 son ventas de mostrador)
select public.create_counter_sale(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a11", "quantity": 1}]', 'cash')
from generate_series(1, 23);
select set_config('t.page1', public.list_orders('all', null, 20)::text, true);
select is((current_setting('t.page1')::jsonb -> 'meta') - 'nextCursor', '{"limit": 20, "total": 26, "hasMore": true}'::jsonb, 'páginas de 20, con el total y si hay más');
select public.create_counter_sale(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-000000000a11", "quantity": 1}]', 'cash');
select set_config('t.page2', public.list_orders('all', null, 20, current_setting('t.page1')::jsonb -> 'meta' ->> 'nextCursor')::text, true);
select is(
  array(select (e ->> 'number')::integer from jsonb_array_elements(current_setting('t.page1')::jsonb -> 'items') as e)
    || array(select (e ->> 'number')::integer from jsonb_array_elements(current_setting('t.page2')::jsonb -> 'items') as e),
  array(select generate_series(26, 1, -1)), 'el cursor no repite ni salta pedidos, aunque entre uno nuevo');
select is(current_setting('t.page2')::jsonb -> 'meta' -> 'hasMore', 'false'::jsonb, 'la última página no tiene más');
select is((public.list_orders('all', null, 100) -> 'meta' ->> 'limit')::integer, 50, 'el límite máximo es 50');
select throws_ok($$select public.list_orders('soon')$$, 'P0001', 'invalid', 'un filtro que no existe');
select throws_ok($$select public.list_orders('all', null, 20, 'abc')$$, 'P0001', 'invalid', 'un cursor que no es de la lista');

-- Las plantillas
select is(array(select t ->> 'key' from jsonb_array_elements(public.list_templates()) as t order by 1),
  array['ask_review', 'balance_reminder', 'confirmation', 'delivered', 'on_the_way', 'ready', 'we_miss_you'], 'las siete plantillas de WhatsApp');

-- Otro dueño no ve nada
select tests.login_as('00000000-0000-4000-8000-0000000009a4');
select is(public.order_counts(), '{"today": 0, "toDeliver": 0, "upcoming": 0, "toCollect": 0, "all": 0}'::jsonb, 'otro dueño no ve los pedidos');
select throws_ok(format('select public.get_order(%L)', current_setting('t.ana')), 'P0001', 'not_found', 'ni abre uno');
select is(public.find_customer_by_phone('+51900000991'), null, 'ni encuentra a sus clientes');
select tests.logout();

select * from finish();
