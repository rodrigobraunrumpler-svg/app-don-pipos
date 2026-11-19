-- Las tablas de productos y stock: sus reglas (también con el valor vacío), el registro de cambios y quién lee qué
select plan(41);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
select tests.make_user('00000000-0000-4000-8000-0000000009a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009a2', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents) values
  ('00000000-0000-4000-8000-0000000009c1', '00000000-0000-4000-8000-0000000009b1', 'Coqueta', 1200),
  ('00000000-0000-4000-8000-0000000009c2', '00000000-0000-4000-8000-0000000009b2', 'Coqueta', 1200);
insert into public.stock_levels (business_id, product_id, on_hand) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 5),
  ('00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009c2', 7);
insert into public.stock_movements (id, business_id, product_id, kind, quantity, request_id) values
  ('00000000-0000-4000-8000-0000000009d1', '00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'production', 5, gen_random_uuid()),
  ('00000000-0000-4000-8000-0000000009d2', '00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009c2', 'production', 7, gen_random_uuid());

-- Productos
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', 0)$$, '23514', null, 'un precio de 0 no se guarda');
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', null)$$, '23502', null, 'ni un precio vacío');
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', 1000001)$$, '23514', null, 'ni uno de más de S/ 10,000');
select throws_ok($$insert into public.products (business_id, name, price_cents, cost_cents) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', 1200, 0)$$, '23514', null, 'un costo de 0 tampoco (vacío sí)');
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', '   ', 1200)$$, '23514', null, 'un nombre en blanco no se guarda');
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', null, 1200)$$, '23502', null, 'ni un nombre vacío');
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', repeat('a', 41), 1200)$$, '23514', null, 'ni uno de 41 letras');
select throws_ok($$insert into public.products (business_id, name, price_cents, min_stock) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', 1200, -1)$$, '23514', null, 'un mínimo negativo no se guarda');
select throws_ok($$insert into public.products (business_id, name, price_cents, min_stock) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', 1200, null)$$, '23502', null, 'ni uno vacío');
select throws_ok($$insert into public.products (business_id, name, price_cents, image_url) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', 1200, 'http://cdn.sanity.io/a.jpg')$$, '23514', null, 'la foto va por https');
select throws_ok($$insert into public.products (business_id, name, price_cents, sanity_id) values ('00000000-0000-4000-8000-0000000009b1', 'Uno', 1200, '')$$, '23514', null, 'un enlace a la web en blanco no se guarda');
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', 'coqueta', 1300)$$, '23505', null, 'el nombre no se repite en el negocio, sin importar mayúsculas');
select is((select count(*)::integer from public.products where lower(name) = 'coqueta'), 2, 'en otro negocio sí puede haber una Coqueta');

-- Movimientos
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'waste', 1, 'broken')$$, '23514', null, 'una merma suma: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'production', -1)$$, '23514', null, 'una producción resta: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'adjustment', 0, 'count')$$, '23514', null, 'un ajuste de 0: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'production', null)$$, '23502', null, 'una cantidad vacía: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'gift', 1)$$, '23514', null, 'un tipo que no existe: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', null, 1)$$, '23502', null, 'un tipo vacío: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'waste', -1)$$, '23514', null, 'una merma sin motivo: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'waste', -1, 'count')$$, '23514', null, 'una merma con el motivo de un ajuste: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'adjustment', 2, null)$$, '23514', null, 'un ajuste sin motivo: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'production', 1, 'broken')$$, '23514', null, 'una producción con motivo: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'adjustment', -5, 'undo')$$, '23514', null, 'un deshacer sin el movimiento que deshace: no');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason, reverts_movement_id) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'adjustment', -5, 'count', '00000000-0000-4000-8000-0000000009d1')$$, '23514', null, 'un conteo que apunta a otro movimiento: no');
insert into public.stock_movements (business_id, product_id, kind, quantity, reason, reverts_movement_id) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'adjustment', -5, 'undo', '00000000-0000-4000-8000-0000000009d1');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason, reverts_movement_id) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'adjustment', -5, 'undo', '00000000-0000-4000-8000-0000000009d1')$$, '23505', null, 'un movimiento no se deshace dos veces');
select throws_ok($$insert into public.stock_movements (business_id, product_id, kind, quantity, reason, reverts_movement_id) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', 'adjustment', -7, 'undo', '00000000-0000-4000-8000-0000000009d2')$$, '23503', null, 'ni se deshace el movimiento de otro negocio');
select throws_ok($$insert into public.stock_levels (business_id, product_id) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c2')$$, '23503', null, 'el stock no apunta al producto de otro negocio');
select ok((select reloptions from pg_catalog.pg_class where oid = 'public.stock_levels'::regclass) @> array['fillfactor=70'], 'stock_levels deja espacio libre en cada bloque (fillfactor 70)');

-- Outbox
select throws_ok($$insert into private.web_sync_outbox (business_id, product_id, payload) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', '{"priceMinor": 1200, "isAvailable": true}')$$, '23514', null, 'el outbox exige isVisible');
select throws_ok($$insert into private.web_sync_outbox (business_id, product_id, payload) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', '{"priceMinor": 1200, "isAvailable": true, "isVisible": true, "name": "x"}')$$, '23514', null, 'y no acepta claves de más');
select throws_ok($$insert into private.web_sync_outbox (business_id, product_id, payload) values ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009c1', null)$$, '23502', null, 'ni un payload vacío');

-- Registro de cambios
update public.products set price_cents = 1300 where id = '00000000-0000-4000-8000-0000000009c1';
select results_eq(
  $$select table_name, row_id, old_data, new_data from private.audit_log where business_id = '00000000-0000-4000-8000-0000000009b1'$$,
  $$values ('products', '00000000-0000-4000-8000-0000000009c1'::uuid, '{"price_cents": 1200}'::jsonb, '{"price_cents": 1300}'::jsonb)$$,
  'cambiar el precio queda en el registro, con el de antes y el de después');
update public.products set min_stock = 6 where id = '00000000-0000-4000-8000-0000000009c1';
select is((select count(*)::integer from private.audit_log where business_id = '00000000-0000-4000-8000-0000000009b1'), 1, 'cambiar el mínimo, no');
create table pg_temp.zz_audit (id uuid primary key, business_id uuid, x integer);
create trigger audit_changes after update on pg_temp.zz_audit for each row execute function private.audit_changes('no_existe');
insert into pg_temp.zz_audit values (gen_random_uuid(), '00000000-0000-4000-8000-0000000009b1', 1);
select throws_ok('update pg_temp.zz_audit set x = 2', 'XX000', null, 'el registro avisa si le piden vigilar una columna que no existe');

-- Quién lee qué
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select is((select array_agg(id) from public.products), array['00000000-0000-4000-8000-0000000009c1'::uuid], 'el dueño lee sus productos, no los de otro negocio');
select is((select array_agg(on_hand) from public.stock_levels), array[5], 'su stock');
select is((select count(*)::integer from public.stock_movements), 2, 'y sus movimientos');
select throws_ok($$insert into public.products (business_id, name, price_cents) values ('00000000-0000-4000-8000-0000000009b1', 'Otro', 1200)$$, '42501', null, 'la app no crea productos directo');
select throws_ok($$update public.stock_levels set on_hand = 100$$, '42501', null, 'ni cambia el stock directo');
select throws_ok('select * from private.web_sync_outbox', '42501', null, 'ni lee el outbox');
select tests.logout();

select * from finish();
