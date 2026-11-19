-- Reintentos: el mismo código con los mismos datos devuelve lo mismo; con otros datos es un conflicto.
-- Y las fechas del historial salen en un formato que cualquier celular lee (milisegundos y «Z»)
select plan(9);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)');
insert into public.products (id, business_id, name, price_cents) values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-0000000009b1', 'Coqueta', 1200),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-0000000009b1', 'Morenita', 1200);
select tests.login_as('00000000-0000-4000-8000-0000000009a1');

select set_config('t.p', public.register_production('00000000-0000-4000-8000-00000000f001', '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 2}]')::text, true);
select is(public.register_production('00000000-0000-4000-8000-00000000f001', '[{"productId": "00000000-0000-4000-8000-000000000a01", "quantity": 2}]'),
  current_setting('t.p')::jsonb, 'producción: el mismo código y los mismos datos devuelven lo mismo');
select throws_ok($$select public.register_production('00000000-0000-4000-8000-00000000f001', '[{"productId": "00000000-0000-4000-8000-000000000a02", "quantity": 5}]')$$,
  'P0001', 'conflict', 'producción: el mismo código con otros datos es un conflicto');

select public.register_waste('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-000000000a01', 1, 'broken');
select is((public.register_waste('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-000000000a01', 1, 'broken') ->> 'onHand')::integer, 1,
  'merma: el mismo código y los mismos datos devuelven lo mismo');
select throws_ok($$select public.register_waste('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-000000000a01', 3, 'broken')$$,
  'P0001', 'conflict', 'merma: otra cantidad con el mismo código es un conflicto');
select throws_ok($$select public.register_waste('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-000000000a02', 1, 'broken')$$,
  'P0001', 'conflict', 'merma: otro alfajor con el mismo código, también');

select set_config('t.c', public.register_stock_count('00000000-0000-4000-8000-00000000f003', '[{"productId": "00000000-0000-4000-8000-000000000a01", "counted": 7}]')::text, true);
select is(public.register_stock_count('00000000-0000-4000-8000-00000000f003', '[{"productId": "00000000-0000-4000-8000-000000000a01", "counted": 7}]'),
  current_setting('t.c')::jsonb, 'conteo: el mismo código y los mismos datos devuelven lo mismo, sin otro ajuste');
select throws_ok($$select public.register_stock_count('00000000-0000-4000-8000-00000000f003', '[{"productId": "00000000-0000-4000-8000-000000000a01", "counted": 9}]')$$,
  'P0001', 'conflict', 'conteo: otro número con el mismo código es un conflicto');
select is((select on_hand from public.stock_levels where product_id = '00000000-0000-4000-8000-000000000a01'), 7, 'y el stock quedó como el primer conteo');

select matches(
  public.list_product_movements('00000000-0000-4000-8000-000000000a01') -> 'items' -> 0 ->> 'happenedAt',
  '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$',
  'la fecha de un movimiento sale con milisegundos y en UTC («Z»)');
select tests.logout();

select * from finish();
