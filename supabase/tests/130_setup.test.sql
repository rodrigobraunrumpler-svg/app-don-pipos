-- La puesta en marcha de la primera vez: el stock de hoy y los tipos de gasto, una sola vez (docs/spec/businesses.md §3)
select plan(19);

select tests.make_user('00000000-0000-4000-8000-0000000018c1');
select tests.make_user('00000000-0000-4000-8000-0000000018c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000018d1', '00000000-0000-4000-8000-0000000018c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000018d2', '00000000-0000-4000-8000-0000000018c2', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents, min_stock, is_active, sort_order) values
  ('00000000-0000-4000-8000-0000000018a1', '00000000-0000-4000-8000-0000000018d1', 'Coqueta', 1200, 6, true, 1),
  ('00000000-0000-4000-8000-0000000018a2', '00000000-0000-4000-8000-0000000018d1', 'Morenita', 1200, 6, true, 2),
  ('00000000-0000-4000-8000-0000000018a3', '00000000-0000-4000-8000-0000000018d1', 'Limon Kiss', 1200, 0, true, 3),
  ('00000000-0000-4000-8000-0000000018a9', '00000000-0000-4000-8000-0000000018d2', 'De otro', 1200, 0, true, 1);
insert into public.expense_categories (business_id, name, icon, sort_order) values
  ('00000000-0000-4000-8000-0000000018d1', 'Gas', 'fire', 1);

-- Los movimientos de la puesta en marcha de un alfajor
create function pg_temp.initial(p_product uuid) returns integer[] language sql as $$
  select coalesce(array_agg(m.quantity order by m.happened_at), '{}') from public.stock_movements m
  where m.product_id = p_product and m.kind = 'adjustment' and m.reason = 'initial';
$$;

select tests.login_as('00000000-0000-4000-8000-0000000018c1');
select is((public.get_business() ->> 'setupDone')::boolean, false, 'sin la fecha, falta la puesta en marcha');

-- Limon Kiss: 3 hechos y 3 apartados para un pedido de hoy. Libre 0, en la nevera 3
select public.register_production(gen_random_uuid(), '[{"productId": "00000000-0000-4000-8000-0000000018a3", "quantity": 3}]');
select public.create_order(gen_random_uuid(), jsonb_build_object(
  'customer', jsonb_build_object('phone', '+51900001801', 'name', 'Ana (DEMO)'),
  'fulfillment', 'pickup',
  'lines', jsonb_build_array(jsonb_build_object('productId', '00000000-0000-4000-8000-0000000018a3', 'quantity', 3))));

select throws_ok('select public.complete_setup(gen_random_uuid(), ''{}'', ''[]'')', 'P0001', 'invalid',
  'el stock tiene que ser una lista');
select throws_ok('select public.complete_setup(gen_random_uuid(), ''[]'', ''[{"name": "Insumos", "icon": "Mi Ícono"}]'')',
  'P0001', 'invalid', 'un ícono raro no vale');
select throws_ok('select public.complete_setup(gen_random_uuid(), ''[]'', ''[{"name": "   ", "icon": "fire"}]'')',
  'P0001', 'invalid', 'ni un nombre vacío');
select throws_ok('select public.complete_setup(gen_random_uuid(), ''[]'', ''[{"name": "Gas", "icon": "fire", "color": "red"}]'')',
  'P0001', 'invalid', 'ni una clave de más');
select throws_ok(format('select public.complete_setup(gen_random_uuid(), %L, %L)', '[]',
  (select jsonb_agg(jsonb_build_object('name', 'Tipo ' || i, 'icon', 'fire')) from generate_series(1, 21) as i)),
  'P0001', 'invalid', 'ni más de 20 tipos');
select throws_ok('select public.complete_setup(gen_random_uuid(), ''[{"productId": "00000000-0000-4000-8000-0000000018a9", "counted": 4}]'', ''[]'')',
  'P0001', 'not_found', 'un alfajor de otro negocio no se encuentra');

select set_config('t.r1', gen_random_uuid()::text, true);
select set_config('t.stock', '[{"productId": "00000000-0000-4000-8000-0000000018a1", "counted": 10},
  {"productId": "00000000-0000-4000-8000-0000000018a2", "counted": 0},
  {"productId": "00000000-0000-4000-8000-0000000018a3", "counted": 5}]', true);
select set_config('t.categories', '[{"name": "Insumos", "icon": "basket-outline"},
  {"name": " Empaques ", "icon": "package-variant-closed"}, {"name": "insumos", "icon": "basket-outline"},
  {"name": "GAS", "icon": "fire"}]', true);
select set_config('t.done', public.complete_setup(current_setting('t.r1')::uuid, current_setting('t.stock')::jsonb,
  current_setting('t.categories')::jsonb)::text, true);
select is(current_setting('t.done')::jsonb, '{"adjustments": 2, "categories": 2}'::jsonb,
  'dos alfajores con diferencia y dos tipos nuevos');
select is((public.get_business() ->> 'setupDone')::boolean, true, 'y ya no falta la puesta en marcha');
select is(public.complete_setup(current_setting('t.r1')::uuid, current_setting('t.stock')::jsonb,
  current_setting('t.categories')::jsonb), current_setting('t.done')::jsonb,
  'el mismo código devuelve lo mismo (una respuesta perdida no la repite)');
select throws_ok(format('select public.complete_setup(gen_random_uuid(), %L, %L)', current_setting('t.stock'), '[]'),
  'P0001', 'conflict', 'una segunda puesta en marcha responde conflict');
select tests.logout();

select is(pg_temp.initial('00000000-0000-4000-8000-0000000018a1'), '{10}', 'Coqueta: un ajuste «Stock inicial» de +10');
select is((select l.on_hand from public.stock_levels l where l.product_id = '00000000-0000-4000-8000-0000000018a1'), 10,
  'y su stock queda en 10');
select is(pg_temp.initial('00000000-0000-4000-8000-0000000018a2'), '{}', 'Morenita en 0: sin diferencia, sin movimiento');
select is(pg_temp.initial('00000000-0000-4000-8000-0000000018a3'), '{2}',
  'Limon Kiss: 5 contados con 3 en la nevera (apartados) → +2, sin tocar lo comprometido');
select is((select array_agg(c.name || ' ' || c.icon order by c.sort_order) from public.expense_categories c
  where c.business_id = '00000000-0000-4000-8000-0000000018d1'),
  '{"Gas fire","Insumos basket-outline","Empaques package-variant-closed"}',
  'los tipos nuevos van después del que había, sin repetir ni espacios de más');
select is((select count(*)::integer from public.stock_movements m where m.reason = 'initial'), 2,
  'repetir con el mismo código no registró de nuevo');
select ok((select setup_done_at from public.businesses where id = '00000000-0000-4000-8000-0000000018d1') is not null,
  'la fecha queda en el negocio');
select ok((select setup_done_at from public.businesses where id = '00000000-0000-4000-8000-0000000018d2') is null
  and not exists (select 1 from public.expense_categories c where c.business_id = '00000000-0000-4000-8000-0000000018d2'),
  'otro negocio queda igual');

select * from finish();
