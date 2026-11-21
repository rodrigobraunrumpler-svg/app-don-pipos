-- Fase 9, los detalles de la revisión final: «Nuevo» solo si la app creó la página, guardar sin descripción ni alérgenos
-- no los borra, el registro anota los ajustes y lo de la web, y lo pendiente de otro negocio no se ve
-- (docs/plan/fase-9-alfajores-web.md, «Después de la revisión final»)
select plan(11);

select tests.make_user('00000000-0000-4000-8000-0000000153a1');
select tests.make_user('00000000-0000-4000-8000-0000000153a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000153b1', '00000000-0000-4000-8000-0000000153a1', 'Don Pipos (DEMO)'),
  ('00000000-0000-4000-8000-0000000153b2', '00000000-0000-4000-8000-0000000153a2', 'Otro (DEMO)');
insert into public.business_settings (business_id) values ('00000000-0000-4000-8000-0000000153b1') on conflict do nothing;
insert into public.products (id, business_id, name, price_cents, sort_order, sanity_id, description, allergens, photo_path, show_on_web) values
  ('00000000-0000-4000-8000-0000000153c1', '00000000-0000-4000-8000-0000000153b1', 'Tropi', 1300, 1, null, 'Frutas tropicales', '{}',
    '00000000-0000-4000-8000-0000000153b1/00000000-0000-4000-8000-0000000153c1/00000000-0000-4000-8000-0000000153f1.jpg', true),
  ('00000000-0000-4000-8000-0000000153c2', '00000000-0000-4000-8000-0000000153b1', 'Kiwi', 1300, 2, null, 'Relleno de kiwi', '{}',
    '00000000-0000-4000-8000-0000000153b1/00000000-0000-4000-8000-0000000153c2/00000000-0000-4000-8000-0000000153f2.jpg', true),
  ('00000000-0000-4000-8000-0000000153c3', '00000000-0000-4000-8000-0000000153b1', 'Coqueta', 1200, 3, null, 'Frutos rojos', '{gluten,lacteos}', null, false),
  ('00000000-0000-4000-8000-0000000153c9', '00000000-0000-4000-8000-0000000153b2', 'De otro', 1200, 1, 'product-don-pipos-test-153-otro', null, '{}', null, true);
update private.web_sync_outbox set sent_at = now() where sent_at is null;
delete from vault.secrets where name = 'web_sync_business_id';
select vault.create_secret('00000000-0000-4000-8000-0000000153b1', 'web_sync_business_id');

-- 1. «Nuevo» solo si la app creó la página (o ya era «Nuevo»); enlazarlo a una que ya existía no lo vuelve nuevo
select private.finish_web_sync('{}', null,
  '{"productId": "00000000-0000-4000-8000-0000000153c1", "sanityId": "product-don-pipos-test-153-tropi", "slug": "alfajor-tropi", "isNew": "true"}');
select isnt((select p.web_published_at from public.products p where p.id = '00000000-0000-4000-8000-0000000153c1'), null, 'la página que creó la app es «Nuevo»');
select private.finish_web_sync('{}', null,
  '{"productId": "00000000-0000-4000-8000-0000000153c2", "sanityId": "product-don-pipos-test-153-kiwi", "slug": "alfajor-kiwi"}');
select is((select p.sanity_id from public.products p where p.id = '00000000-0000-4000-8000-0000000153c2'), 'product-don-pipos-test-153-kiwi', 'la que ya existía queda enlazada');
select is((select p.web_published_at from public.products p where p.id = '00000000-0000-4000-8000-0000000153c2'), null, 'pero no es «Nuevo»');

-- 2. Guardar sin la descripción ni los alérgenos los deja como están; vacíos a propósito, los borra
select tests.login_as('00000000-0000-4000-8000-0000000153a1');
select public.save_product('00000000-0000-4000-8000-0000000153c3', 1, 'Coqueta', 1250, null, 0, false);
select is((select p.description from public.products p where p.id = '00000000-0000-4000-8000-0000000153c3'), 'Frutos rojos', 'sin descripción, queda la que tenía');
select is((select p.allergens from public.products p where p.id = '00000000-0000-4000-8000-0000000153c3'), '{gluten,lacteos}'::text[], 'y sus alérgenos');
select public.save_product('00000000-0000-4000-8000-0000000153c3', 2, 'Coqueta', 1250, null, 0, false, '', '{}');
select is((select p.description from public.products p where p.id = '00000000-0000-4000-8000-0000000153c3'), null, 'vacía a propósito, se borra');
select is((select p.allergens from public.products p where p.id = '00000000-0000-4000-8000-0000000153c3'), '{}'::text[], 'y los alérgenos también');

-- 3. El registro anota los ajustes nuevos y lo de la web de cada alfajor
select public.update_settings((select s.version from public.business_settings s where s.business_id = '00000000-0000-4000-8000-0000000153b1'),
  '{"productsBySales": true, "reviewUrl": "https://g.page/r/demo/review"}');
select tests.logout();
select is((select l.new_data from private.audit_log l where l.table_name = 'business_settings' and l.business_id = '00000000-0000-4000-8000-0000000153b1' order by l.id desc limit 1),
  '{"products_by_sales": true, "review_url": "https://g.page/r/demo/review"}'::jsonb, 'cambiar los más vendidos o el enlace de reseñas queda en el registro');
select is((select l.new_data ? 'description' and l.new_data ? 'allergens' from private.audit_log l
  where l.table_name = 'products' and l.row_id = '00000000-0000-4000-8000-0000000153c3' order by l.id desc limit 1),
  true, 'y cambiar la descripción o los alérgenos de un alfajor');

-- 4. Lo pendiente de un alfajor de otro negocio no se ve, aunque la función corra con los permisos de la base
insert into private.web_sync_outbox (business_id, product_id, payload, kind)
  values ('00000000-0000-4000-8000-0000000153b2', '00000000-0000-4000-8000-0000000153c9', '{"priceMinor": 1, "isAvailable": true, "isVisible": true}', 'state');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-8000-0000000153a1', 'role', 'authenticated')::text, true);
select is((select w.pending from private.web_sync_pending('00000000-0000-4000-8000-0000000153b2', '00000000-0000-4000-8000-0000000153c9') w),
  false, 'el dueño de otro negocio no ve lo pendiente');
select set_config('request.jwt.claims', '', true);
select is((select w.pending from private.web_sync_pending('00000000-0000-4000-8000-0000000153b2', '00000000-0000-4000-8000-0000000153c9') w),
  true, 'el servidor (sin usuario) sí');

select * from finish();
