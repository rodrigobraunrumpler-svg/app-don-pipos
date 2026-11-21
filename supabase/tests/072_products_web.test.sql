-- Fase 9: cada alfajor con su descripción, sus alérgenos, su foto y su estado en la web (docs/plan/fase-9-alfajores-web.md)
select plan(31);

select tests.make_user('00000000-0000-4000-8000-0000000072a1');
select tests.make_user('00000000-0000-4000-8000-0000000072a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000072b1', '00000000-0000-4000-8000-0000000072a1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000072b2', '00000000-0000-4000-8000-0000000072a2', 'Negocio B (DEMO)');
-- Lo pendiente de otros datos no entra en estas cuentas
update private.web_sync_outbox set sent_at = now() where sent_at is null;

create function pg_temp.kinds(p_product uuid) returns text[] language sql as $$
  select coalesce(array_agg(o.kind order by o.id), '{}') from private.web_sync_outbox o where o.product_id = p_product and o.sent_at is null;
$$;

select tests.login_as('00000000-0000-4000-8000-0000000072a1');

-- 1. Crear con descripción y alérgenos
select set_config('t.p', public.save_product(null, null, 'Coqueta', 1200, null, 0, true,
  ' Relleno de frutos rojos y bañado en chocolate ', array['gluten', 'lacteos']) ->> 'id', true);
select is((public.list_products() -> 0 ->> 'description'), 'Relleno de frutos rojos y bañado en chocolate', 'guarda la descripción, sin espacios de más');
select is((public.list_products() -> 0 -> 'allergens'), '["gluten", "lacteos"]'::jsonb, 'y sus alérgenos');
select is((public.list_products() -> 0 ->> 'hasPhoto')::boolean, false, 'todavía sin foto');
select is((public.list_products() -> 0 ->> 'webState'), 'pending', 'se ve en la web y espera la copia');
select is((public.list_products() -> 0 ->> 'isNew')::boolean, false, 'sin publicar no es «Nuevo»');
select throws_ok($$select public.save_product(null, null, 'Larga', 1200, null, 0, false, repeat('a', 401), null)$$, 'P0001', 'invalid', 'una descripción de más de 400 letras');
select throws_ok($$select public.save_product(null, null, 'Rara', 1200, null, 0, false, null, array['chocolate'])$$, 'P0001', 'invalid', 'un alérgeno que la web no conoce');
select lives_ok($$select public.save_product(null, null, 'Vieja', 1200, null, 0, true)$$, 'las llamadas de antes (sin descripción) siguen funcionando');

-- 2. Qué tipo de cambio anota
select tests.logout();
select is(pg_temp.kinds(current_setting('t.p')::uuid), array['content'], 'crear un alfajor que se ve anota su contenido');
update private.web_sync_outbox set sent_at = now() where sent_at is null;
-- Desde aquí, enlazado: ya está en la web
update public.products set sanity_id = 'product-don-pipos-alfajor-coqueta-test' where id = current_setting('t.p')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000072a1');
select public.save_product(current_setting('t.p')::uuid, 1, 'Coqueta', 1300, null, 0, true, 'Relleno de frutos rojos y bañado en chocolate', array['gluten', 'lacteos']);
select tests.logout();
select is(pg_temp.kinds(current_setting('t.p')::uuid), array['state'], 'cambiar solo el precio anota el estado');
update private.web_sync_outbox set sent_at = now() where sent_at is null;
select tests.login_as('00000000-0000-4000-8000-0000000072a1');
select public.save_product(current_setting('t.p')::uuid, 2, 'Coqueta', 1300, null, 0, true, 'Frutos rojos y chocolate', array['gluten']);
select tests.logout();
select is(pg_temp.kinds(current_setting('t.p')::uuid), array['content'], 'cambiar la descripción o los alérgenos anota el contenido');
update private.web_sync_outbox set sent_at = now() where sent_at is null;
select tests.login_as('00000000-0000-4000-8000-0000000072a1');
select public.save_product(current_setting('t.p')::uuid, 3, 'Coqueta', 1300, 500, 4, true, 'Frutos rojos y chocolate', array['gluten']);
select tests.logout();
select is(pg_temp.kinds(current_setting('t.p')::uuid), '{}'::text[], 'el costo y el mínimo no van a la web');
select tests.login_as('00000000-0000-4000-8000-0000000072a1');
select set_config('t.e', public.save_product(null, null, 'Escondida', 1200, null, 0, false, 'Lista para la web', null) ->> 'id', true);
select tests.logout();
select is(pg_temp.kinds(current_setting('t.e')::uuid), '{}'::text[], 'uno sin enlazar que no se ve no va a la web');
select tests.login_as('00000000-0000-4000-8000-0000000072a1');
select public.save_product(current_setting('t.e')::uuid, 1, 'Escondida', 1200, null, 0, true, 'Lista para la web', null);
select tests.logout();
select is(pg_temp.kinds(current_setting('t.e')::uuid), array['content'], 'prender «se ve» en uno que todavía no está en la web lo manda a crear');
select tests.login_as('00000000-0000-4000-8000-0000000072a1');

-- 3. La foto
select set_config('t.path', '00000000-0000-4000-8000-0000000072b1/' || current_setting('t.p') || '/' || gen_random_uuid() || '.jpg', true);
select throws_ok(format('select public.set_product_photo(%L, %L)', current_setting('t.p'), '00000000-0000-4000-8000-0000000072b2/' || current_setting('t.p') || '/' || gen_random_uuid() || '.jpg'),
  'P0001', 'invalid', 'una ruta de otro negocio no');
select throws_ok(format('select public.set_product_photo(%L, %L)', current_setting('t.p'), '00000000-0000-4000-8000-0000000072b1/otra.jpg'),
  'P0001', 'invalid', 'una ruta que no es la del alfajor no');
insert into storage.objects (bucket_id, name) values ('product-photos', current_setting('t.path'));
select is((select count(*)::integer from storage.objects o where o.bucket_id = 'product-photos' and o.name = current_setting('t.path')), 1,
  'el dueño sube la foto en la carpeta de su alfajor');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'product-photos',
  '00000000-0000-4000-8000-0000000072b2/' || current_setting('t.p') || '/' || gen_random_uuid() || '.jpg'), '42501', null,
  'pero no en la carpeta de otro negocio');
select is((public.set_product_photo(current_setting('t.p')::uuid, current_setting('t.path')) ->> 'hasPhoto')::boolean, true, 'con foto');
select tests.logout();
select is(pg_temp.kinds(current_setting('t.p')::uuid), array['content'], 'la foto nueva anota el contenido');

-- 4. El estado en la web, en sus seis casos
create function pg_temp.state(p_product uuid) returns text language sql as $$
  select private.product_json(p) ->> 'webState' from public.products p where p.id = p_product;
$$;
select is(pg_temp.state(current_setting('t.p')::uuid), 'pending', 'con algo pendiente: «Subiendo a la web…»');
update private.web_sync_outbox set attempts = 3 where product_id = current_setting('t.p')::uuid and sent_at is null;
select is(pg_temp.state(current_setting('t.p')::uuid), 'failing', 'con 3 intentos: no se pudo');
update private.web_sync_outbox set sent_at = now() where product_id = current_setting('t.p')::uuid and sent_at is null;
select is(pg_temp.state(current_setting('t.p')::uuid), 'sent', 'enlazado y visible, sin nada pendiente: en la web');
update public.products set sanity_id = null where id = current_setting('t.p')::uuid;
select is(pg_temp.state(current_setting('t.p')::uuid), 'waiting', 'completo, sin enlazar y sin nada pendiente: todavía no está en la web');
update public.products set photo_path = null where id = current_setting('t.p')::uuid;
select is(pg_temp.state(current_setting('t.p')::uuid), 'incomplete', 'sin foto: le falta algo para salir en la web');
update public.products set show_on_web = false where id = current_setting('t.p')::uuid;
select is(pg_temp.state(current_setting('t.p')::uuid), 'none', 'sin enlazar y sin «se ve»: solo en la app');
update public.products set sanity_id = 'product-don-pipos-alfajor-coqueta-test' where id = current_setting('t.p')::uuid;
select is(pg_temp.state(current_setting('t.p')::uuid), 'hidden', 'enlazado y escondido: oculto');

-- 5. «Nuevo» por 30 días desde que salió en la web
update public.products set web_published_at = now() - interval '29 days' where id = current_setting('t.p')::uuid;
select is((select (private.product_json(p) ->> 'isNew')::boolean from public.products p where p.id = current_setting('t.p')::uuid), true, 'a los 29 días es «Nuevo»');
update public.products set web_published_at = now() - interval '31 days' where id = current_setting('t.p')::uuid;
select is((select (private.product_json(p) ->> 'isNew')::boolean from public.products p where p.id = current_setting('t.p')::uuid), false, 'a los 31 días ya no');

-- 6. Lo que no se toca directo
select tests.login_as('00000000-0000-4000-8000-0000000072a1');
select throws_ok(format('update public.products set photo_path = null where id = %L', current_setting('t.p')), '42501', null, 'nadie cambia la foto sin la función');
select tests.login_as('00000000-0000-4000-8000-0000000072a2');
select throws_ok(format('select public.set_product_photo(%L, %L)', current_setting('t.p'), '00000000-0000-4000-8000-0000000072b2/' || current_setting('t.p') || '/' || gen_random_uuid() || '.jpg'),
  'P0001', 'not_found', 'el dueño de otro negocio no le pone foto');
