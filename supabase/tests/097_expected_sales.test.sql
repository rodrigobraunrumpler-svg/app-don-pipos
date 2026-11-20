-- La venta esperada (D16): la sugerencia de producción con su porqué, hasta cuándo alcanza cada alfajor y «Cómo se vende»
select plan(14);

select tests.make_user('00000000-0000-4000-8000-0000000009c5');
select tests.make_user('00000000-0000-4000-8000-0000000009c6');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009d5', '00000000-0000-4000-8000-0000000009c5', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000009d6', '00000000-0000-4000-8000-0000000009c6', 'Negocio B (DEMO)');
insert into public.products (id, business_id, name, price_cents, min_stock, sort_order) values
  ('00000000-0000-4000-8000-000000000e01', '00000000-0000-4000-8000-0000000009d5', 'Coqueta', 1200, 6, 1),
  ('00000000-0000-4000-8000-000000000e02', '00000000-0000-4000-8000-0000000009d5', 'Morenita', 1200, 2, 2),
  ('00000000-0000-4000-8000-000000000e03', '00000000-0000-4000-8000-0000000009d6', 'Coqueta', 1200, 2, 1);

-- Una venta de mostrador en un día pasado (directo en la tabla: así se arma la historia)
create function pg_temp.sell(p_business uuid, p_product uuid, p_day date, p_units integer, p_number integer,
  p_status text default 'delivered', p_scheduled boolean default false) returns void language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.orders (id, business_id, number, channel, fulfillment, status, due_date, scheduled_for, delivered_at,
    cancel_reason, subtotal_cents, total_cents, paid_cents, items_summary, items_count, created_at)
  values (v_id, p_business, p_number, 'local', 'counter', p_status, p_day, case when p_scheduled then p_day end,
    (p_day + time '12:00') at time zone 'America/Lima', case when p_status = 'cancelled' then 'prueba' end,
    p_units * 1200, p_units * 1200, p_units * 1200, p_units || ' Coquetas', p_units, (p_day + time '10:00') at time zone 'America/Lima');
  insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents)
  values (p_business, v_id, p_product, 'Coqueta', p_units, 1200);
end;
$$;

-- Negocio A, las últimas 4 semanas: Coqueta 5 al día de lunes a viernes y 9 sábados y domingos; Morenita 5 todos los días
select pg_temp.sell('00000000-0000-4000-8000-0000000009d5', '00000000-0000-4000-8000-000000000e01', d.day,
  case when extract(isodow from d.day) in (6, 7) then 9 else 5 end, d.n * 2 - 1),
  pg_temp.sell('00000000-0000-4000-8000-0000000009d5', '00000000-0000-4000-8000-000000000e02', d.day, 5, d.n * 2)
from (select n, (now() at time zone 'America/Lima')::date - n as day from generate_series(1, 28) as n) d;
-- Un pedido para otro día y uno anulado: no cuentan
select pg_temp.sell('00000000-0000-4000-8000-0000000009d5', '00000000-0000-4000-8000-000000000e01',
  (now() at time zone 'America/Lima')::date - 3, 100, 1001, 'delivered', true);
select pg_temp.sell('00000000-0000-4000-8000-0000000009d5', '00000000-0000-4000-8000-000000000e01',
  (now() at time zone 'America/Lima')::date - 3, 100, 1002, 'cancelled');
-- Negocio B: 6 días de historia
select pg_temp.sell('00000000-0000-4000-8000-0000000009d6', '00000000-0000-4000-8000-000000000e03',
  (now() at time zone 'America/Lima')::date - n, 3, n)
from generate_series(1, 6) as n;

select tests.login_as('00000000-0000-4000-8000-0000000009c5');
select public.register_production(gen_random_uuid(),
  '[{"productId": "00000000-0000-4000-8000-000000000e01", "quantity": 13}, {"productId": "00000000-0000-4000-8000-000000000e02", "quantity": 13}]');
select set_config('t.s', public.production_suggestion()::text, true);
select set_config('t.coqueta', (select e::text from jsonb_array_elements(current_setting('t.s')::jsonb -> 'items') as e where e ->> 'name' = 'Coqueta'), true);

select is(current_setting('t.s')::jsonb -> 'ready', 'true'::jsonb, 'con 4 semanas de ventas, sugiere');
select is((current_setting('t.coqueta')::jsonb ->> 'suggested')::integer, 36, '5 × 5 + 9 × 2 + mínimo 6 − stock 13 = 36');
select is((current_setting('t.coqueta')::jsonb ->> 'expected')::integer, 43, 'la venta esperada de la semana');
select is(array[(current_setting('t.coqueta')::jsonb ->> 'weekdayUnits')::numeric, (current_setting('t.coqueta')::jsonb ->> 'weekdayDays')::numeric,
  (current_setting('t.coqueta')::jsonb ->> 'weekendUnits')::numeric, (current_setting('t.coqueta')::jsonb ->> 'weekendDays')::numeric],
  array[25, 5, 18, 2]::numeric[], 'el porqué: lunes a viernes y sábado y domingo, sin el pedido para otro día ni el anulado');
select is((current_setting('t.s')::jsonb ->> 'horizonDays')::integer, 7, 'cubre los días de producción del negocio');

-- «Cómo se vende»
select is(array(select (e ->> 'average')::numeric from jsonb_array_elements(public.product_sales_by_weekday('00000000-0000-4000-8000-000000000e01') -> 'days') as e),
  array[5, 5, 5, 5, 5, 9, 9]::numeric[], 'el gráfico: 5 de lunes a viernes y 9 los sábados y domingos');

-- Hasta cuándo alcanza (Morenita, 5 todos los días): 13 libres alcanzan 2 días; 7, uno solo → «poco» aunque pase el mínimo
select set_config('t.m', (select e::text from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'Morenita'), true);
select is((current_setting('t.m')::jsonb ->> 'coverageDays')::integer, 2, '13 alcanzan para 2 días de 5');
select is(current_setting('t.m')::jsonb ->> 'state', 'ok', 'y está bien');
select public.register_waste(gen_random_uuid(), '00000000-0000-4000-8000-000000000e02', 6, 'broken');
select set_config('t.m', (select e::text from jsonb_array_elements(public.stock_overview()) as e where e ->> 'name' = 'Morenita'), true);
select is((current_setting('t.m')::jsonb ->> 'coverageDays')::integer, 1, '7 alcanzan para un día');
select is(current_setting('t.m')::jsonb ->> 'state', 'low', 'y queda en «poco» aunque pase el mínimo');

-- Con menos de 7 días de historia no sugiere; con 7, sí
select tests.login_as('00000000-0000-4000-8000-0000000009c6');
select is(public.production_suggestion() -> 'ready', 'false'::jsonb, 'con 6 días de ventas no sugiere');
select is(public.production_suggestion() -> 'items', '[]'::jsonb, 'y no trae alfajores');
select is((select e -> 'coverageDays' from jsonb_array_elements(public.stock_overview()) as e), 'null'::jsonb, 'ni sabe hasta cuándo alcanza');
select tests.logout();
select pg_temp.sell('00000000-0000-4000-8000-0000000009d6', '00000000-0000-4000-8000-000000000e03',
  (now() at time zone 'America/Lima')::date - 7, 3, 7);
select tests.login_as('00000000-0000-4000-8000-0000000009c6');
select is(public.production_suggestion() -> 'ready', 'true'::jsonb, 'con 7 días ya sugiere');
select tests.logout();

select * from finish();
