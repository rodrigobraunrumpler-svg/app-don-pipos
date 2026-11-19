-- Las funciones de productos: crear, cambiar con versión, el outbox de la web, el registro y desactivar
select plan(35);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
select tests.make_user('00000000-0000-4000-8000-0000000009a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009b2', '00000000-0000-4000-8000-0000000009a2', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents) values
  ('00000000-0000-4000-8000-0000000009c2', '00000000-0000-4000-8000-0000000009b2', 'Coqueta', 1200);

select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select is(public.list_products(), '[]'::jsonb, 'sin productos, la lista está vacía');

select set_config('t.coqueta', public.save_product(null, null, ' Coqueta ', 1200, null, 0, true) ->> 'id', true);
select is(
  (public.list_products() -> 0) - 'id',
  '{"name": "Coqueta", "priceCents": 1200, "costCents": null, "minStock": 0, "showOnWeb": true, "isActive": true, "sortOrder": 1, "imageUrl": null, "linkedToWeb": false, "version": 1}'::jsonb,
  'crear un producto: sin espacios a los lados, versión 1 y el primero de la lista');
select set_config('t.morenita', public.save_product(null, null, 'Morenita', 1200, 510, 6, true) ->> 'id', true);
select is((public.list_products() -> 1 ->> 'sortOrder')::integer, 2, 'el siguiente queda segundo');

-- Lo que no se guarda
select throws_ok($$select public.save_product(null, null, 'Uno', 0, null, 0, true)$$, 'P0001', 'invalid', 'un precio de 0');
select throws_ok($$select public.save_product(null, null, 'Uno', -5, null, 0, true)$$, 'P0001', 'invalid', 'un precio negativo');
select throws_ok($$select public.save_product(null, null, 'Uno', null, null, 0, true)$$, 'P0001', 'invalid', 'un precio vacío');
select throws_ok($$select public.save_product(null, null, 'Uno', 1000001, null, 0, true)$$, 'P0001', 'invalid', 'un precio de más de S/ 10,000');
select throws_ok($$select public.save_product(null, null, 'Uno', 1200, 0, 0, true)$$, 'P0001', 'invalid', 'un costo de 0');
select throws_ok($$select public.save_product(null, null, '  ', 1200, null, 0, true)$$, 'P0001', 'invalid', 'un nombre en blanco');
select throws_ok($$select public.save_product(null, null, null, 1200, null, 0, true)$$, 'P0001', 'invalid', 'un nombre vacío');
select throws_ok($$select public.save_product(null, null, repeat('a', 41), 1200, null, 0, true)$$, 'P0001', 'invalid', 'un nombre de 41 letras');
select throws_ok($$select public.save_product(null, null, 'Uno', 1200, null, -1, true)$$, 'P0001', 'invalid', 'un mínimo negativo');
select throws_ok($$select public.save_product(null, null, 'Uno', 1200, null, null, true)$$, 'P0001', 'invalid', 'un mínimo vacío');
select throws_ok($$select public.save_product(null, null, 'Uno', 1200, null, 0, null)$$, 'P0001', 'invalid', '«se ve en la web» vacío');
select throws_ok($$select public.save_product(null, 1, 'Uno', 1200, null, 0, true)$$, 'P0001', 'invalid', 'crear con una versión');
select throws_ok(format('select public.save_product(%L, null, %L, 1200, null, 0, true)', current_setting('t.coqueta'), 'Coqueta'), 'P0001', 'invalid', 'cambiar sin versión');
select throws_ok($$select public.save_product(null, null, 'coqueta', 1300, null, 0, true)$$, 'P0001', 'conflict', 'un nombre repetido, sin importar mayúsculas');
select throws_ok($$select public.save_product('00000000-0000-4000-8000-0000000009c2', 1, 'Coqueta', 1300, null, 0, true)$$, 'P0001', 'not_found', 'el producto de otro negocio no se encuentra');
select throws_ok($$select public.save_product('00000000-0000-4000-8000-0000000009ff', 1, 'Coqueta', 1300, null, 0, true)$$, 'P0001', 'not_found', 'ni uno que no existe');

-- Enlazada a la web: el precio y si se ve van al outbox; el mínimo, no
select tests.logout();
update public.products set sanity_id = 'alfajor-coqueta' where id = current_setting('t.coqueta')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select is(public.save_product(current_setting('t.coqueta')::uuid, 1, 'Coqueta', 1300, null, 0, true) - 'id',
  '{"name": "Coqueta", "priceCents": 1300, "costCents": null, "minStock": 0, "showOnWeb": true, "isActive": true, "sortOrder": 1, "imageUrl": null, "linkedToWeb": true, "version": 2}'::jsonb,
  'cambiar el precio sube la versión');
select throws_ok(format('select public.save_product(%L, 1, %L, 1400, null, 0, true)', current_setting('t.coqueta'), 'Coqueta'), 'P0001', 'conflict', 'con una versión vieja, conflicto');
select is((public.save_product(current_setting('t.coqueta')::uuid, 2, 'Coqueta', 1300, null, 6, true) ->> 'version')::integer, 3, 'cambiar solo el mínimo también sube la versión');
select is((public.save_product(current_setting('t.morenita')::uuid, 1, 'Morenita', 1250, 510, 6, true) ->> 'priceCents')::integer, 1250, 'Morenita, sin enlazar, cambia de precio');
select tests.logout();
select results_eq(
  $$select payload from private.web_sync_outbox where product_id = current_setting('t.coqueta')::uuid order by id$$,
  $$values ('{"priceMinor": 1300, "isAvailable": false, "isVisible": true}'::jsonb)$$,
  'una sola fila para la web: el precio nuevo, sin stock; el mínimo no cuenta');
select is((select count(*)::integer from private.web_sync_outbox where product_id = current_setting('t.morenita')::uuid), 0, 'lo que no está enlazado no va al outbox');
select is(
  (select count(*)::integer from private.audit_log where row_id = current_setting('t.coqueta')::uuid and new_data ? 'price_cents'),
  1, 'el cambio de precio queda en el registro');

-- Desactivar y activar
insert into public.stock_levels (business_id, product_id, on_hand) values ('00000000-0000-4000-8000-0000000009b1', current_setting('t.coqueta')::uuid, 5);
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
select is((public.set_product_active(current_setting('t.coqueta')::uuid, false) ->> 'version')::integer, 4, 'desactivar sube la versión');
select is((select array_agg(e ->> 'name') from jsonb_array_elements(public.list_products()) as e), array['Morenita'], 'un desactivado no sale en la lista');
select is((public.set_product_active(current_setting('t.coqueta')::uuid, true) ->> 'isActive')::boolean, true, 'y se puede activar otra vez');
select is((public.save_product(current_setting('t.coqueta')::uuid, 5, 'Coqueta', 1300, null, 6, false) ->> 'showOnWeb')::boolean, false, 'ocultar en la web');
select throws_ok($$select public.set_product_active('00000000-0000-4000-8000-0000000009c2', false)$$, 'P0001', 'not_found', 'el de otro negocio no se desactiva');
select throws_ok(format('select public.set_product_active(%L, null)', current_setting('t.coqueta')), 'P0001', 'invalid', 'sin decir si se activa, no');
select tests.logout();
select results_eq(
  $$select payload from private.web_sync_outbox where product_id = current_setting('t.coqueta')::uuid order by id offset 1$$,
  $$values ('{"priceMinor": 1300, "isAvailable": true, "isVisible": false}'::jsonb),
           ('{"priceMinor": 1300, "isAvailable": true, "isVisible": true}'::jsonb),
           ('{"priceMinor": 1300, "isAvailable": true, "isVisible": false}'::jsonb)$$,
  'desactivar la oculta en la web, activarla la muestra, y ocultarla también va; con stock, disponible');

-- Otro negocio ve lo suyo
select tests.login_as('00000000-0000-4000-8000-0000000009a2');
select is((select array_agg(e ->> 'id') from jsonb_array_elements(public.list_products()) as e), array['00000000-0000-4000-8000-0000000009c2'], 'cada dueño ve solo sus productos');
select throws_ok($$update public.products set price_cents = 1 where id = '00000000-0000-4000-8000-0000000009c2'$$, '42501', null, 'y no los cambia directo');
select tests.logout();

select * from finish();
