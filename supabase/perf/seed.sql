-- Datos para medir: 5,000 negocios, cada uno con su dueño. Corren dentro de la transacción del medidor
-- y se deshacen con ella. Cada fase suma aquí los datos de sus tablas.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select
  ('00000000-0000-4000-9000-' || lpad(to_hex(n), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'medidor-' || n || '@prueba.invalid', '', now(), now()
from generate_series(1, 5000) as n;

insert into public.businesses (id, owner_id, name, modules)
select
  ('00000000-0000-4000-a000-' || lpad(to_hex(n), 12, '0'))::uuid,
  ('00000000-0000-4000-9000-' || lpad(to_hex(n), 12, '0'))::uuid,
  'Negocio ' || n || ' (DEMO)',
  '{orders,stock}'
from generate_series(1, 5000) as n;

analyze public.businesses;
analyze public.business_settings;
analyze private.business_counters;

-- Fase 3: 5 productos por negocio, 4 movimientos por producto, y el negocio medido (el 2,500) con 3 años de
-- movimientos: una producción y una merma cada día por producto. Con 20 por producto (500,000 filas), el seed pasaba
-- del tiempo máximo por sentencia de la base
insert into public.products (id, business_id, name, price_cents, min_stock, sort_order)
select
  ('00000000-0000-4000-b000-' || lpad(to_hex(n * 10 + k), 12, '0'))::uuid,
  ('00000000-0000-4000-a000-' || lpad(to_hex(n), 12, '0'))::uuid,
  'Alfajor ' || k, 1200, 6, k
from generate_series(1, 5000) as n, generate_series(1, 5) as k;

insert into public.stock_movements (business_id, product_id, kind, quantity, happened_at)
select p.business_id, p.id, 'production', 1 + m % 10, now() - m * interval '1 day'
from public.products p, generate_series(1, 4) as m;

insert into public.stock_movements (business_id, product_id, kind, quantity, reason, happened_at)
select p.business_id, p.id,
  case when d % 2 = 0 then 'production' else 'waste' end,
  case when d % 2 = 0 then 3 else -1 end,
  case when d % 2 = 0 then null else 'broken' end,
  now() - interval '30 days' - d * interval '12 hours'
from public.products p, generate_series(1, 2190) as d
where p.business_id = '00000000-0000-4000-a000-0000000009c4';

insert into public.stock_levels (business_id, product_id, on_hand)
select m.business_id, m.product_id, sum(m.quantity)::integer
from public.stock_movements m
group by m.business_id, m.product_id;

analyze public.products;
analyze public.stock_levels;
analyze public.stock_movements;
