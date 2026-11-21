-- Fase 9, después de la revisión final: lo que cambia mientras se crea la página de un alfajor llega igual a la web, la
-- copia no se traba si un documento ya es de otro alfajor, dos alfajores no comparten nombre en la web y la foto que sube
-- la app no causa conflictos (docs/plan/fase-9-alfajores-web.md, «Después de la revisión final»)
select plan(16);

select tests.make_user('00000000-0000-4000-8000-0000000152a1');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000152b1', '00000000-0000-4000-8000-0000000152a1', 'Don Pipos (DEMO)');
insert into public.products (id, business_id, name, price_cents, sort_order, sanity_id, description, photo_path, show_on_web) values
  ('00000000-0000-4000-8000-0000000152c1', '00000000-0000-4000-8000-0000000152b1', 'Coqueta', 1200, 1, 'product-don-pipos-test-152-coqueta', null, null, true),
  ('00000000-0000-4000-8000-0000000152c2', '00000000-0000-4000-8000-0000000152b1', 'Tropi', 1300, 2, null, 'Relleno de frutas tropicales',
    '00000000-0000-4000-8000-0000000152b1/00000000-0000-4000-8000-0000000152c2/00000000-0000-4000-8000-0000000152f1.jpg', true),
  ('00000000-0000-4000-8000-0000000152c3', '00000000-0000-4000-8000-0000000152b1', 'Morenita', 1200, 3, null, 'Relleno de chocolate',
    '00000000-0000-4000-8000-0000000152b1/00000000-0000-4000-8000-0000000152c3/00000000-0000-4000-8000-0000000152f2.jpg', true);
update private.web_sync_outbox set sent_at = now() where sent_at is null;
delete from vault.secrets where name = 'web_sync_business_id';
select vault.create_secret('00000000-0000-4000-8000-0000000152b1', 'web_sync_business_id');

create function pg_temp.queue(p_product uuid, p_kind text) returns void language sql as $$
  insert into private.web_sync_outbox (business_id, product_id, payload, kind)
  values ('00000000-0000-4000-8000-0000000152b1', p_product, '{"priceMinor": 1, "isAvailable": true, "isVisible": true}', p_kind);
$$;
-- Las filas que la copia toma de un alfajor
create function pg_temp.claimed(p_product uuid) returns bigint[] language sql as $$
  select array(select jsonb_array_elements_text(e -> 'ids')::bigint)
  from jsonb_array_elements(private.claim_web_sync()) e where e ->> 'productId' = p_product::text;
$$;
create function pg_temp.pending(p_product uuid, p_kind text) returns bigint language sql as $$
  select count(*) from private.web_sync_outbox o where o.product_id = p_product and o.sent_at is null and o.kind = p_kind;
$$;

-- 1. «Deshacer» mientras se crea la página: el alfajor queda enlazado y su estado de ahora (oculto) vuelve a la web
select pg_temp.queue('00000000-0000-4000-8000-0000000152c2', 'content');
create temp table run1 as select pg_temp.claimed('00000000-0000-4000-8000-0000000152c2') as ids;
select tests.login_as('00000000-0000-4000-8000-0000000152a1');
select public.save_product('00000000-0000-4000-8000-0000000152c2', 1, 'Tropi', 1300, null, 0, false, 'Relleno de frutas tropicales', null);
select tests.logout();
select private.finish_web_sync((select ids from run1), null,
  '{"productId": "00000000-0000-4000-8000-0000000152c2", "sanityId": "product-don-pipos-test-152-tropi", "slug": "alfajor-tropi", "isNew": "true"}');
select is((select p.sanity_id from public.products p where p.id = '00000000-0000-4000-8000-0000000152c2'),
  'product-don-pipos-test-152-tropi', 'la página creada queda enlazada');
select is(pg_temp.pending('00000000-0000-4000-8000-0000000152c2', 'state'), 1::bigint, 'y su estado de ahora vuelve a la web');
select is((private.web_state('00000000-0000-4000-8000-0000000152c2') ->> 'isVisible')::boolean, false, 'oculto, como lo dejó «Deshacer»');

-- 2. Un cambio de precio de uno enlazado: no anota nada más (no hay vueltas sin fin) y no toca su fila
update private.web_sync_outbox set sent_at = now() where sent_at is null;
select pg_temp.queue('00000000-0000-4000-8000-0000000152c1', 'state');
create temp table run2 as select pg_temp.claimed('00000000-0000-4000-8000-0000000152c1') as ids,
  (select p.ctid::text from public.products p where p.id = '00000000-0000-4000-8000-0000000152c1') as row_ctid;
select private.finish_web_sync((select ids from run2), null, '{"productId": "00000000-0000-4000-8000-0000000152c1"}');
select is(pg_temp.pending('00000000-0000-4000-8000-0000000152c1', 'state'), 0::bigint, 'no vuelve a anotar su estado');
select is((select p.ctid::text from public.products p where p.id = '00000000-0000-4000-8000-0000000152c1'), (select row_ctid from run2),
  'ni cambia su fila: la copia no la bloquea mientras sube las fotos de otros');

-- 3. La página que encontró ya es de otro alfajor: no se enlaza, no se traba la copia y sus filas vuelven como fallidas
select pg_temp.queue('00000000-0000-4000-8000-0000000152c3', 'content');
create temp table run3 as select pg_temp.claimed('00000000-0000-4000-8000-0000000152c3') as ids;
select lives_ok(format('select private.finish_web_sync(%L, null, %L)', (select ids from run3),
  '{"productId": "00000000-0000-4000-8000-0000000152c3", "sanityId": "product-don-pipos-test-152-coqueta", "slug": "alfajor-coqueta"}'),
  'un documento que ya es de otro alfajor no corta la corrida');
select is((select p.sanity_id from public.products p where p.id = '00000000-0000-4000-8000-0000000152c3'), null, 'no se enlaza');
select is((select count(*) from private.web_sync_outbox o where o.id in (select unnest(r.ids) from run3 r) and o.sent_at is null and o.attempts = 1 and o.last_error is not null),
  cardinality((select ids from run3))::bigint, 'sus filas quedan pendientes, con un intento y el error');

-- 4. Dos alfajores no comparten nombre en la web: «Alfajor Coqueta» es «Coqueta»
select tests.login_as('00000000-0000-4000-8000-0000000152a1');
select throws_ok($$select public.save_product(null, null, 'Alfajor Coqueta', 1200, null, 0, false, null, null)$$,
  'P0001', 'conflict', 'un nombre que en la web sería el de otro alfajor se rechaza');
select throws_ok($$select public.save_product('00000000-0000-4000-8000-0000000152c3', 1, 'Alfajor Tropi', 1200, null, 0, true, 'Relleno de chocolate', null)$$,
  'P0001', 'conflict', 'también al cambiarle el nombre');

-- 5. La foto que sube la app no cambia la versión: guardar justo después (o «Deshacer») no choca con ella
select public.set_product_photo('00000000-0000-4000-8000-0000000152c1',
  '00000000-0000-4000-8000-0000000152b1/00000000-0000-4000-8000-0000000152c1/00000000-0000-4000-8000-0000000152f3.jpg');
select is((select p.version from public.products p where p.id = '00000000-0000-4000-8000-0000000152c1'), 1, 'la foto no cambia la versión');
select lives_ok($$select public.save_product('00000000-0000-4000-8000-0000000152c1', 1, 'Coqueta', 1250, null, 0, true, null, null)$$,
  'y guardar con la versión de antes de la foto funciona');
select tests.logout();

-- 6. Uno que nació en el panel (enlazado por el equipo) conserva su nombre de allá y sus alérgenos si la app no tiene;
-- los que creó la app, y los que todavía no están en la web, llevan el nombre de la app
select is(private.web_content('00000000-0000-4000-8000-0000000152c1') ? 'name', false, 'el nombre del panel no se pisa');
select is(private.web_content('00000000-0000-4000-8000-0000000152c1') ? 'allergens', false, 'ni sus alérgenos, si la app no tiene');
update public.products set allergens = '{gluten}' where id = '00000000-0000-4000-8000-0000000152c1';
select is(private.web_content('00000000-0000-4000-8000-0000000152c1') -> 'allergens', '["gluten"]'::jsonb, 'los que pone la app sí van');
select is(private.web_content('00000000-0000-4000-8000-0000000152c2') ->> 'name', 'Alfajor Tropi', 'uno que creó la app lleva el nombre de la app');
