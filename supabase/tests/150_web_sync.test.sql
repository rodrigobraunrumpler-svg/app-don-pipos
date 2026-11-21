-- La copia a la web (docs/spec/products.md §3, fase 8): la función sync-to-web toma lo pendiente del negocio enlazado a
-- la web, uno por alfajor y con su estado de ahora, lo manda a Sanity y anota lo enviado o el error. La base la llama al
-- momento y cada minuto, solo con sus secretos en Vault y algo pendiente. Lo de otro negocio (DEMO) nunca se manda
select plan(29);

select tests.make_user('00000000-0000-4000-8000-0000000015c1');
select tests.make_user('00000000-0000-4000-8000-0000000015c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000015d1', '00000000-0000-4000-8000-0000000015c1', 'Don Pipos (DEMO)'),
  ('00000000-0000-4000-8000-0000000015d2', '00000000-0000-4000-8000-0000000015c2', 'Otro negocio (DEMO)');
insert into public.products (id, business_id, name, price_cents, min_stock, is_active, sort_order, sanity_id) values
  ('00000000-0000-4000-8000-0000000015a1', '00000000-0000-4000-8000-0000000015d1', 'Coqueta', 1200, 6, true, 1, 'coqueta-demo'),
  ('00000000-0000-4000-8000-0000000015a2', '00000000-0000-4000-8000-0000000015d1', 'Morenita', 1200, 6, true, 2, 'morenita-demo'),
  ('00000000-0000-4000-8000-0000000015a3', '00000000-0000-4000-8000-0000000015d1', 'Limon Kiss', 1200, 6, true, 3, null),
  ('00000000-0000-4000-8000-0000000015a9', '00000000-0000-4000-8000-0000000015d2', 'De otro negocio', 1200, 6, true, 1, 'otro-demo');
-- Lo pendiente de otros datos del proyecto no entra en estas cuentas, y la prueba tiene sus propios valores de Vault
update private.web_sync_outbox set sent_at = now() where sent_at is null;
delete from vault.secrets where name in ('web_sync_url', 'web_sync_secret', 'web_sync_business_id');

create function pg_temp.item(p_sanity_id text) returns jsonb language sql as $$
  select e from jsonb_array_elements(private.claim_web_sync()) e where e ->> 'sanityId' = p_sanity_id;
$$;
create function pg_temp.calls() returns bigint language sql as $$
  select count(*) from net.http_request_queue q where q.url = 'https://sync.invalid/functions/v1/sync-to-web';
$$;

-- 0. Sin el negocio de la web en Vault no se toca nada
insert into private.web_sync_outbox (business_id, product_id, payload) values
  ('00000000-0000-4000-8000-0000000015d1', '00000000-0000-4000-8000-0000000015a1', '{"priceMinor": 1200, "isAvailable": true, "isVisible": true}');
select is(private.claim_web_sync(), '[]'::jsonb, 'sin el negocio de la web, no se manda nada');
select is((select count(*) from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a1' and o.sent_at is null), 1::bigint, 'y lo pendiente sigue pendiente');
select is(private.web_sync_due('2026-11-20 15:07:00+00'), false, 'ni toca llamar a la función');
select vault.create_secret('00000000-0000-4000-8000-0000000015d1', 'web_sync_business_id');

-- 1. Dos cambios de Coqueta y uno de Morenita: sale uno por alfajor, con su estado de ahora y todas sus filas
insert into private.web_sync_outbox (business_id, product_id, payload) values
  ('00000000-0000-4000-8000-0000000015d1', '00000000-0000-4000-8000-0000000015a2', '{"priceMinor": 1200, "isAvailable": false, "isVisible": true}'),
  ('00000000-0000-4000-8000-0000000015d1', '00000000-0000-4000-8000-0000000015a1', '{"priceMinor": 1250, "isAvailable": true, "isVisible": true}');
update public.products set price_cents = 1300 where id = '00000000-0000-4000-8000-0000000015a1';
select is(jsonb_array_length(private.claim_web_sync()), 2, 'sale uno por alfajor');
select is(pg_temp.item('coqueta-demo') -> 'payload', '{"priceMinor": 1300, "isAvailable": false, "isVisible": true, "sortOrder": 10, "isNew": false}'::jsonb, 'Coqueta, con su precio, su stock y su orden de ahora (no los de la fila más nueva)');
select is(jsonb_array_length(pg_temp.item('coqueta-demo') -> 'ids'), 2, 'y con sus dos filas');

-- 2. Enviado: sus filas quedan cerradas
select private.finish_web_sync((select array_agg(o.id) from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a1'), null);
select is((select count(*) from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a1' and o.sent_at is null), 0::bigint, 'lo enviado queda cerrado');

-- 3. Con error: suma un intento, guarda el error y sigue pendiente
select private.finish_web_sync((select array_agg(o.id) from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a2'), 'HTTP 401: Unauthorized');
select is((select o.attempts from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a2'), 1, 'un intento más');
select is((select o.last_error from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a2'), 'HTTP 401: Unauthorized', 'con su error');
select is((pg_temp.item('morenita-demo') ->> 'attempts')::integer, 1, 'sigue pendiente, y dice cuántos intentos lleva');

-- 4. Un alfajor que ya no está enlazado cierra sus filas sin mandar nada
update public.products set sanity_id = null where id = '00000000-0000-4000-8000-0000000015a2';
select is(private.claim_web_sync(), '[]'::jsonb, 'un alfajor desenlazado, sin foto ni descripción, no se crea');
select is((select o.last_error from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a2'), 'incomplete', 'y sus filas quedan cerradas hasta el próximo cambio');

-- 4b. Lo de otro negocio (los datos DEMO) se cierra sin mandarse
insert into private.web_sync_outbox (business_id, product_id, payload) values
  ('00000000-0000-4000-8000-0000000015d2', '00000000-0000-4000-8000-0000000015a9', '{"priceMinor": 1200, "isAvailable": true, "isVisible": true}');
select is(private.claim_web_sync(), '[]'::jsonb, 'lo de otro negocio no se manda');
select is((select o.last_error from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a9'), 'not_live_business', 'y queda cerrado');

-- 5. Enlazar un alfajor anota su estado completo; uno de otro negocio no se enlaza
select private.link_product('00000000-0000-4000-8000-0000000015a3', 'limon-kiss-demo', 'https://cdn.sanity.io/images/demo/limon.jpg');
select is((select o.payload from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000015a3' and o.sent_at is null), '{"priceMinor": 1200, "isAvailable": false, "isVisible": true}'::jsonb, 'enlazar anota su estado completo');
select throws_ok($$select private.link_product('00000000-0000-4000-8000-000000000000', 'x', null)$$, 'P0001', 'not_found', 'un alfajor que no existe');
select throws_ok($$select private.link_product('00000000-0000-4000-8000-0000000015a9', 'otro-demo', null)$$, 'P0001', 'not_found', 'uno de otro negocio no se enlaza');

-- 6. Cuándo llama la base: con algo pendiente, cada minuto; con 10 intentos o más, solo a la hora en punto
select is(private.web_sync_due('2026-11-20 15:07:00+00'), true, 'con algo pendiente, llama');
update private.web_sync_outbox set attempts = 10 where sent_at is null;
select is(private.web_sync_due('2026-11-20 15:07:00+00'), false, 'con 10 intentos, no cada minuto');
select is(private.web_sync_due('2026-11-20 15:00:00+00'), true, 'sí a la hora en punto');
update private.web_sync_outbox set sent_at = now() where sent_at is null;
select is(private.web_sync_due('2026-11-20 15:00:00+00'), false, 'sin nada pendiente, nunca');

-- 7. Sin la URL y el secreto en Vault no llama; con ellos, un cambio llama una vez por transacción, con el secreto
select private.link_product('00000000-0000-4000-8000-0000000015a1', 'coqueta-demo', null);
select is(pg_temp.calls(), 0::bigint, 'sin los secretos de Vault no llama a nada');
select vault.create_secret('https://sync.invalid/functions/v1/sync-to-web', 'web_sync_url');
select vault.create_secret('secreto-de-prueba', 'web_sync_secret');
select set_config('app.web_sync_kicked', '', true);
select private.link_product('00000000-0000-4000-8000-0000000015a1', 'coqueta-demo', null);
select is(pg_temp.calls(), 1::bigint, 'con los secretos, un cambio llama a la función');
select private.link_product('00000000-0000-4000-8000-0000000015a3', 'limon-kiss-demo', null);
select is(pg_temp.calls(), 1::bigint, 'otro cambio en la misma transacción no vuelve a llamar');
select is((select q.headers ->> 'x-web-sync-secret' from net.http_request_queue q where q.url = 'https://sync.invalid/functions/v1/sync-to-web'), 'secreto-de-prueba', 'y lleva el secreto');

-- 8. Si llamar a la función falla (pg_net o Vault rotos), el cambio del dueño igual se guarda
create or replace function private.kick_web_sync() returns void language plpgsql set search_path = '' as $$
begin
  raise exception 'pg_net no responde';
end;
$$;
select lives_ok($$insert into private.web_sync_outbox (business_id, product_id, payload) values ('00000000-0000-4000-8000-0000000015d1', '00000000-0000-4000-8000-0000000015a1', '{"priceMinor": 1300, "isAvailable": true, "isVisible": true}')$$, 'si llamar a la función falla, el cambio del dueño igual se guarda');

-- 9. Los trabajos del cron: el reintento cada minuto, y la limpieza diaria de su historial (el plan gratis tiene 500 MB)
select is((select j.schedule from cron.job j where j.jobname = 'web-sync-retry'), '* * * * *', 'la copia se reintenta cada minuto');
select is((select j.schedule from cron.job j where j.jobname = 'purge-cron-history'), '40 8 * * *', 'el historial del cron se limpia cada día');
select ok(private.purge_cron_history() >= 0, 'y la limpieza corre');

select * from finish();
