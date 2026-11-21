-- Fase 9: el orden de los alfajores en la web (a mano o por los más vendidos), «Nuevo» que vence y los ajustes nuevos
-- (docs/plan/fase-9-alfajores-web.md, tarea 3)
select plan(16);

select tests.make_user('00000000-0000-4000-8000-0000000073a1');
select tests.make_user('00000000-0000-4000-8000-0000000073a2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000073b1', '00000000-0000-4000-8000-0000000073a1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000073b2', '00000000-0000-4000-8000-0000000073a2', 'Negocio B (DEMO)');
insert into public.business_settings (business_id) values ('00000000-0000-4000-8000-0000000073b1') on conflict do nothing;
insert into public.products (id, business_id, name, price_cents, sort_order, sanity_id) values
  ('00000000-0000-4000-8000-0000000073c1', '00000000-0000-4000-8000-0000000073b1', 'Coqueta', 1200, 1, 'product-don-pipos-test-073-coqueta'),
  ('00000000-0000-4000-8000-0000000073c2', '00000000-0000-4000-8000-0000000073b1', 'Morenita', 1200, 2, 'product-don-pipos-test-073-morenita'),
  ('00000000-0000-4000-8000-0000000073c3', '00000000-0000-4000-8000-0000000073b1', 'Pipo Crush', 1300, 3, null),
  ('00000000-0000-4000-8000-0000000073c9', '00000000-0000-4000-8000-0000000073b2', 'De otro', 1200, 1, null);
update private.web_sync_outbox set sent_at = now() where sent_at is null;

create function pg_temp.order_names() returns text[] language sql as $$
  select array_agg(p.name order by p.sort_order) from public.products p where p.business_id = '00000000-0000-4000-8000-0000000073b1';
$$;
create function pg_temp.pending() returns bigint language sql as $$
  select count(*) from private.web_sync_outbox o where o.business_id = '00000000-0000-4000-8000-0000000073b1' and o.sent_at is null and o.kind = 'state';
$$;

-- 1. Ordenar a mano: el orden nuevo, y su estado va a la web (los enlazados)
select tests.login_as('00000000-0000-4000-8000-0000000073a1');
select is((select array_agg(e ->> 'name') from jsonb_array_elements(public.reorder_products(array[
  '00000000-0000-4000-8000-0000000073c3', '00000000-0000-4000-8000-0000000073c1', '00000000-0000-4000-8000-0000000073c2']::uuid[])) as e),
  array['Pipo Crush', 'Coqueta', 'Morenita'], 'el orden nuevo, en la lista que vuelve');
select tests.logout();
select is(pg_temp.order_names(), array['Pipo Crush', 'Coqueta', 'Morenita'], 'queda guardado');
select is((private.web_state('00000000-0000-4000-8000-0000000073c1') ->> 'sortOrder')::integer, 20, 'en la web, el segundo va con 20');
select is(pg_temp.pending(), 2::bigint, 'los dos enlazados mandan su orden a la web');
update private.web_sync_outbox set sent_at = now() where sent_at is null;
select tests.login_as('00000000-0000-4000-8000-0000000073a1');
select throws_ok($$select public.reorder_products(array['00000000-0000-4000-8000-0000000073c1', '00000000-0000-4000-8000-0000000073c9']::uuid[])$$,
  'P0001', 'not_found', 'uno de otro negocio no se ordena');
select throws_ok($$select public.reorder_products(array['00000000-0000-4000-8000-0000000073c1', '00000000-0000-4000-8000-0000000073c1']::uuid[])$$,
  'P0001', 'invalid', 'repetido, no');

-- 2. Los ajustes nuevos: el enlace de reseñas (https) y los más vendidos primero
select is((public.update_settings((select s.version from public.business_settings s where s.business_id = '00000000-0000-4000-8000-0000000073b1'),
  '{"reviewUrl": "https://g.page/r/demo/review"}') ->> 'reviewUrl'), 'https://g.page/r/demo/review', 'guarda el enlace de reseñas');
select throws_ok(format('select public.update_settings(%s, %L)', (select s.version from public.business_settings s where s.business_id = '00000000-0000-4000-8000-0000000073b1'),
  '{"reviewUrl": "http://g.page/r/demo"}'), 'P0001', 'invalid', 'sin https, no');
select is((public.update_settings((select s.version from public.business_settings s where s.business_id = '00000000-0000-4000-8000-0000000073b1'),
  '{"reviewUrl": null}') -> 'reviewUrl'), 'null'::jsonb, 'y se puede borrar');

-- Ventas de los últimos 30 días: Morenita 5, Coqueta 2, Pipo Crush nada; y una vieja de Pipo Crush que no cuenta
select tests.logout();
insert into public.orders (id, business_id, number, channel, fulfillment, status, due_date, subtotal_cents, total_cents, items_summary, items_count, delivered_at) values
  ('00000000-0000-4000-8000-0000000073d1', '00000000-0000-4000-8000-0000000073b1', 1, 'local', 'counter', 'delivered', current_date, 6000, 6000, '5 Morenitas', 5, now() - interval '2 days'),
  ('00000000-0000-4000-8000-0000000073d2', '00000000-0000-4000-8000-0000000073b1', 2, 'local', 'counter', 'delivered', current_date, 2400, 2400, '2 Coquetas', 2, now() - interval '3 days'),
  ('00000000-0000-4000-8000-0000000073d3', '00000000-0000-4000-8000-0000000073b1', 3, 'local', 'counter', 'delivered', current_date - 60, 13000, 13000, '10 Pipo Crush', 10, now() - interval '60 days');
insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents) values
  ('00000000-0000-4000-8000-0000000073b1', '00000000-0000-4000-8000-0000000073d1', '00000000-0000-4000-8000-0000000073c2', 'Morenita', 5, 1200),
  ('00000000-0000-4000-8000-0000000073b1', '00000000-0000-4000-8000-0000000073d2', '00000000-0000-4000-8000-0000000073c1', 'Coqueta', 2, 1200),
  ('00000000-0000-4000-8000-0000000073b1', '00000000-0000-4000-8000-0000000073d3', '00000000-0000-4000-8000-0000000073c3', 'Pipo Crush', 10, 1300);
select tests.login_as('00000000-0000-4000-8000-0000000073a1');
select is((public.update_settings((select s.version from public.business_settings s where s.business_id = '00000000-0000-4000-8000-0000000073b1'),
  '{"productsBySales": true}') ->> 'productsBySales')::boolean, true, 'prende «los más vendidos primero»');
select tests.logout();
select is(pg_temp.order_names(), array['Morenita', 'Coqueta', 'Pipo Crush'], 'y ordena al momento por lo vendido en 30 días');
select is(pg_temp.pending(), 2::bigint, 'el orden nuevo va a la web');
select is((select count(*)::integer from cron.job j where j.jobname = 'order-products-by-sales' and j.schedule = '30 8 1 * *'), 1, 'y se vuelve a ordenar el día 1 de cada mes');

-- 3. «Nuevo» vence a los 30 días: ese día se manda el estado sin la etiqueta
update private.web_sync_outbox set sent_at = now() where sent_at is null;
update public.products set web_published_at = now() - interval '30 days 2 hours' where id = '00000000-0000-4000-8000-0000000073c1';
update public.products set web_published_at = now() - interval '10 days' where id = '00000000-0000-4000-8000-0000000073c2';
select is(private.expire_new_badges(), 1, 'la que cumplió 30 días manda su estado sin «Nuevo»');
select is((select count(*)::integer from private.web_sync_outbox o where o.product_id = '00000000-0000-4000-8000-0000000073c1' and o.sent_at is null), 1, 'una fila para la web');
select is((select count(*)::integer from cron.job j where j.jobname = 'expire-new-badges' and j.schedule = '45 8 * * *'), 1, 'se revisa cada día');

select * from finish();
