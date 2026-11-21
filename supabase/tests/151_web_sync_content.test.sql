-- Fase 9: la copia crea la página de un alfajor que todavía no está en la web (con foto y descripción) y manda su
-- contenido solo cuando cambia en la app (docs/plan/fase-9-alfajores-web.md)
select plan(17);

select tests.make_user('00000000-0000-4000-8000-0000000151a1');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000151b1', '00000000-0000-4000-8000-0000000151a1', 'Don Pipos (DEMO)');
insert into public.products (id, business_id, name, price_cents, sort_order, sanity_id, description, photo_path, show_on_web, web_photo_path) values
  ('00000000-0000-4000-8000-0000000151c1', '00000000-0000-4000-8000-0000000151b1', 'Coqueta', 1200, 1, 'product-don-pipos-test-151-coqueta', null, null, true, null),
  ('00000000-0000-4000-8000-0000000151c2', '00000000-0000-4000-8000-0000000151b1', 'Tropi', 1300, 2, null, 'Relleno de frutas tropicales', '00000000-0000-4000-8000-0000000151b1/00000000-0000-4000-8000-0000000151c2/00000000-0000-4000-8000-0000000151f1.jpg', true, null),
  ('00000000-0000-4000-8000-0000000151c3', '00000000-0000-4000-8000-0000000151b1', 'Sin foto', 1200, 3, null, 'Falta la foto', null, true, null),
  ('00000000-0000-4000-8000-0000000151c4', '00000000-0000-4000-8000-0000000151b1', 'Escondido', 1200, 4, null, 'Completo pero no se ve', '00000000-0000-4000-8000-0000000151b1/00000000-0000-4000-8000-0000000151c4/00000000-0000-4000-8000-0000000151f2.jpg', false, null);
update private.web_sync_outbox set sent_at = now() where sent_at is null;
delete from vault.secrets where name = 'web_sync_business_id';
select vault.create_secret('00000000-0000-4000-8000-0000000151b1', 'web_sync_business_id');

create function pg_temp.item(p_product uuid) returns jsonb language sql as $$
  select e from jsonb_array_elements(private.claim_web_sync()) e where e ->> 'productId' = p_product::text;
$$;
create function pg_temp.queue(p_product uuid, p_kind text) returns void language sql as $$
  insert into private.web_sync_outbox (business_id, product_id, payload, kind)
  values ('00000000-0000-4000-8000-0000000151b1', p_product, '{"priceMinor": 1, "isAvailable": true, "isVisible": true}', p_kind);
$$;

-- 1. Un alfajor enlazado: con un cambio de estado va solo su estado; con uno de contenido, también su contenido
select pg_temp.queue('00000000-0000-4000-8000-0000000151c1', 'state');
select is(pg_temp.item('00000000-0000-4000-8000-0000000151c1') -> 'content', 'null'::jsonb, 'un cambio de precio no manda el contenido');
select pg_temp.queue('00000000-0000-4000-8000-0000000151c1', 'content');
select is(pg_temp.item('00000000-0000-4000-8000-0000000151c1') -> 'content',
  '{"photoChanged": false, "alt": "Alfajor Coqueta de Don Pipos"}'::jsonb,
  'uno de contenido sí; de uno que nació en el panel no se pisan el nombre, ni la descripción o los alérgenos que la app no tiene');
select is((pg_temp.item('00000000-0000-4000-8000-0000000151c1') -> 'payload' ->> 'sortOrder')::integer, 10, 'el orden de la web es el de la app por 10');

-- 2. Uno que todavía no está en la web, completo y visible: se crea, con su foto
select pg_temp.queue('00000000-0000-4000-8000-0000000151c2', 'content');
select is(pg_temp.item('00000000-0000-4000-8000-0000000151c2') ->> 'sanityId', null, 'todavía sin documento: hay que crearlo');
select is((pg_temp.item('00000000-0000-4000-8000-0000000151c2') -> 'content' ->> 'photoChanged')::boolean, true, 'con su foto, que todavía no está en la web');
select is(pg_temp.item('00000000-0000-4000-8000-0000000151c2') -> 'content' ->> 'name', 'Alfajor Tropi', 'y su nombre para la web');

-- 3. Al que le falta la foto, y el que no se ve: sus filas se cierran sin crear nada
select pg_temp.queue('00000000-0000-4000-8000-0000000151c3', 'content');
select pg_temp.queue('00000000-0000-4000-8000-0000000151c4', 'content');
select is(pg_temp.item('00000000-0000-4000-8000-0000000151c3'), null, 'sin foto no se crea');
select is((select o.last_error from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000151c3'), 'incomplete', 'queda esperando su foto');
select is((select o.last_error from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000151c4'), 'not_on_web', 'el que no se ve tampoco');

-- 4. Al terminar, el resultado: su documento, su dirección, la foto subida y desde cuándo sale en la web
select private.finish_web_sync(
  (select array_agg(o.id) from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000151c2' and o.sent_at is null),
  null,
  jsonb_build_object('productId', '00000000-0000-4000-8000-0000000151c2', 'sanityId', 'product-don-pipos-alfajor-tropi', 'slug', 'alfajor-tropi', 'isNew', 'true',
    'imageUrl', 'https://cdn.sanity.io/images/demo/tropi.jpg', 'photoPath', '00000000-0000-4000-8000-0000000151b1/00000000-0000-4000-8000-0000000151c2/00000000-0000-4000-8000-0000000151f1.jpg'));
select is((select p.sanity_id from public.products p where p.id = '00000000-0000-4000-8000-0000000151c2'), 'product-don-pipos-alfajor-tropi', 'guarda su documento');
select is((select p.web_slug from public.products p where p.id = '00000000-0000-4000-8000-0000000151c2'), 'alfajor-tropi', 'y su dirección');
select is((select p.image_url from public.products p where p.id = '00000000-0000-4000-8000-0000000151c2'), 'https://cdn.sanity.io/images/demo/tropi.jpg', 'la foto de la web');
select ok((select p.web_published_at > now() - interval '1 minute' from public.products p where p.id = '00000000-0000-4000-8000-0000000151c2'), 'y desde ahora es «Nuevo»');
select is((select (private.web_state(p.id) ->> 'isNew')::boolean from public.products p where p.id = '00000000-0000-4000-8000-0000000151c2'), true, 'el estado para la web lo lleva');
select pg_temp.queue('00000000-0000-4000-8000-0000000151c2', 'content');
select is((pg_temp.item('00000000-0000-4000-8000-0000000151c2') -> 'content' ->> 'photoChanged')::boolean, false, 'la próxima vez, la foto ya no se vuelve a subir');

-- 5. Un resultado no deja de pie una fila ya enviada, y con error no toca el alfajor
select private.finish_web_sync((select array_agg(o.id) from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000151c1'), 'HTTP 500: caída', jsonb_build_object('productId', '00000000-0000-4000-8000-0000000151c1', 'slug', 'otra'));
select is((select p.web_slug from public.products p where p.id = '00000000-0000-4000-8000-0000000151c1'), null, 'con error, el resultado no se guarda');
select is((select count(*)::integer from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000151c1' and o.sent_at is not null and o.attempts > 0), 0, 'y lo ya enviado no suma intentos');
