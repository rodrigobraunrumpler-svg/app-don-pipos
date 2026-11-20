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
from public.products p, generate_series(1, 4) as m
-- solo los productos de este seed: la base de desarrollo también tiene los datos DEMO
where p.id between '00000000-0000-4000-b000-000000000000' and '00000000-0000-4000-b000-ffffffffffff';

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
where m.product_id between '00000000-0000-4000-b000-000000000000' and '00000000-0000-4000-b000-ffffffffffff'
group by m.business_id, m.product_id;

analyze public.products;
analyze public.stock_levels;
analyze public.stock_movements;

-- Fase 4a: el negocio medido (el 2,500) con 300 clientes y 3 años de pedidos, 10 por día (#1 a #10,950), más 20 para los
-- días que vienen. Lo de antes de hoy está entregado (cada décimo, de mostrador; cada 13.º, sin pagar); los de ayer pares
-- siguen atrasados y los de hoy, en curso. Cada uno con una línea, su pago y sus estados
insert into public.customers (id, business_id, name, phone, orders_count, spent_cents, last_order_at)
select
  ('00000000-0000-4000-d000-' || lpad(to_hex(k), 12, '0'))::uuid,
  '00000000-0000-4000-a000-0000000009c4',
  'Cliente ' || k || ' (DEMO)', '+51955' || lpad(k::text, 6, '0'), 36, 36 * 2400, now() - k * interval '1 hour'
from generate_series(1, 300) as k;

insert into public.orders (
  id, business_id, number, customer_id, channel, fulfillment, status, scheduled_for, due_date, delivery_address,
  subtotal_cents, total_cents, paid_cents, delivered_at, customer_name, items_summary, items_count, created_at
)
select
  ('00000000-0000-4000-c000-' || lpad(to_hex(x.n), 12, '0'))::uuid,
  '00000000-0000-4000-a000-0000000009c4',
  x.n,
  case when not x.counter then ('00000000-0000-4000-d000-' || lpad(to_hex(1 + x.n % 300), 12, '0'))::uuid end,
  case when x.counter then 'local' else 'whatsapp' end,
  case when x.counter then 'counter' when x.n % 2 = 1 then 'delivery' else 'pickup' end,
  case when x.delivered then 'delivered' when x.n % 3 = 0 then 'preparing' else 'new' end,
  case when x.days_ago < 0 then x.day end,
  x.day,
  case when not x.counter and x.n % 2 = 1 then 'Jr. Prueba ' || x.n end,
  2400, 2400,
  case when x.counter or (x.delivered and x.n % 13 <> 0) then 2400 else 0 end,
  case when x.delivered then (x.day + time '15:00') at time zone 'America/Lima' end,
  case when not x.counter then 'Cliente ' || (1 + x.n % 300) || ' (DEMO)' end,
  '2 Alfajor ' || (1 + x.n % 5), 2,
  least(now(), (x.day + time '10:00') at time zone 'America/Lima')
from (
  select n, d.days_ago, (now() at time zone 'America/Lima')::date - d.days_ago as day,
    n % 10 = 0 and d.days_ago > 0 as counter,
    (n % 10 = 0 and d.days_ago > 0) or d.days_ago > 1 or (d.days_ago = 1 and n % 2 = 1) as delivered
  from generate_series(1, 10970) as n, lateral (select floor((10950 - n) / 10.0)::integer as days_ago) as d
) as x;

update private.business_counters set next_order_number = 10971 where business_id = '00000000-0000-4000-a000-0000000009c4';

-- Los demás negocios, 6 ventas de mostrador cada uno: así el negocio medido es una parte de la tabla, como en producción,
-- y la base elige el índice que empieza por el negocio
insert into public.orders (
  id, business_id, number, channel, fulfillment, status, due_date, subtotal_cents, total_cents, paid_cents, delivered_at,
  items_summary, items_count, created_at
)
select
  ('00000000-0000-4000-e000-' || lpad(to_hex(b * 10 + k), 12, '0'))::uuid,
  ('00000000-0000-4000-a000-' || lpad(to_hex(b), 12, '0'))::uuid,
  k, 'local', 'counter', 'delivered', (now() at time zone 'America/Lima')::date - k, 1200, 1200, 1200, now() - k * interval '1 day',
  '1 Alfajor 1', 1, now() - k * interval '1 day'
from generate_series(1, 5000) as b, generate_series(1, 6) as k
where b <> 2500;

insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents, created_at)
select o.business_id, o.id, ('00000000-0000-4000-b000-' || lpad(to_hex(25000 + 1 + o.number % 5), 12, '0'))::uuid,
  'Alfajor ' || (1 + o.number % 5), 2, 1200, o.created_at
from public.orders o where o.business_id = '00000000-0000-4000-a000-0000000009c4';

insert into public.payments (business_id, order_id, kind, method, amount_cents, paid_at)
select o.business_id, o.id, 'payment', (array['cash', 'yape', 'plin', 'transfer'])[1 + o.number % 4], o.paid_cents, o.created_at
from public.orders o where o.business_id = '00000000-0000-4000-a000-0000000009c4' and o.paid_cents > 0;

insert into public.order_status_events (business_id, order_id, status, at)
select o.business_id, o.id, 'new', o.created_at
from public.orders o where o.business_id = '00000000-0000-4000-a000-0000000009c4' and o.fulfillment <> 'counter'
union all
select o.business_id, o.id, 'delivered', o.delivered_at
from public.orders o where o.business_id = '00000000-0000-4000-a000-0000000009c4' and o.status = 'delivered';

-- Fase 7a: decenas de miles de clientes. El negocio medido suma 30,000 sin pedidos (nombres que se repiten, con tildes
-- y «ñ», y su último pedido repartido en un año) y cada uno de los demás negocios, 12
insert into public.customers (id, business_id, name, phone, orders_count, spent_cents, last_order_at)
select
  ('00000000-0000-4000-f000-' || lpad(to_hex(k), 12, '0'))::uuid,
  '00000000-0000-4000-a000-0000000009c4',
  (array['Ana', 'Lucía', 'Jorge', 'Rosa', 'Martín', 'Sofía', 'Carlos', 'Miguel', 'Patricia', 'Ñusta'])[1 + k % 10]
    || ' ' || k || ' (DEMO)',
  '+51966' || lpad(k::text, 6, '0'), 1 + k % 20, (1 + k % 20) * 1200, now() - (k % 365) * interval '1 day'
from generate_series(1, 30000) as k;

insert into public.customers (id, business_id, name, phone, orders_count, spent_cents, last_order_at)
select
  ('00000000-0000-4000-f100-' || lpad(to_hex(b * 100 + k), 12, '0'))::uuid,
  ('00000000-0000-4000-a000-' || lpad(to_hex(b), 12, '0'))::uuid,
  'Cliente ' || k || ' (DEMO)', '+51977' || lpad(k::text, 6, '0'), 1, 1200, now() - k * interval '1 day'
from generate_series(1, 5000) as b, generate_series(1, 12) as k
where b <> 2500;

-- La fidelidad del negocio medido encendida, con los 30,000 clientes de 0 a 11 sellos (meta 10)
update public.loyalty_settings set is_active = true, goal = 10 where business_id = '00000000-0000-4000-a000-0000000009c4';
update public.customers c set stamps = (('x' || right(c.id::text, 8))::bit(32)::integer) % 12
where c.business_id = '00000000-0000-4000-a000-0000000009c4' and c.id::text like '00000000-0000-4000-f000-%';

analyze public.customers;
analyze public.orders;
analyze public.order_lines;
analyze public.payments;
analyze public.order_status_events;

-- Fase 5: los pagos de las ventas de los demás negocios (así los del negocio medido son una parte de la tabla, como
-- en producción). El negocio medido, con 5 tipos de gasto y 3 años de gastos (3 por día; cada 20.º anulado y cada 50.º
-- corregido), un ingreso a mano por día (cada 30.º anulado) y un cierre de caja por día. Los demás, un tipo, 3 gastos y
-- un ingreso a mano
insert into public.payments (business_id, order_id, kind, method, amount_cents, paid_at)
select o.business_id, o.id, 'payment', 'cash', o.paid_cents, o.created_at
from public.orders o
where o.id between '00000000-0000-4000-e000-000000000000' and '00000000-0000-4000-e000-ffffffffffff';

insert into public.expense_categories (id, business_id, name, icon, sort_order)
select
  ('00000000-0000-4000-f000-' || lpad(to_hex(n * 10 + k), 12, '0'))::uuid,
  ('00000000-0000-4000-a000-' || lpad(to_hex(n), 12, '0'))::uuid,
  'Tipo ' || k, 'receipt-text-outline', k
from generate_series(1, 5000) as n, generate_series(1, 5) as k
where k = 1 or n = 2500;

insert into public.expenses (business_id, category_id, description, amount_cents, method, spent_at, voided_at, void_reason)
select
  '00000000-0000-4000-a000-0000000009c4',
  ('00000000-0000-4000-f000-' || lpad(to_hex(25000 + 1 + n % 5), 12, '0'))::uuid,
  'Gasto ' || n, 500 + n % 50 * 100, (array['cash', 'yape', 'plin', 'transfer'])[1 + n % 4],
  now() - n * interval '8 hours',
  case when n % 20 = 0 or n % 50 = 0 then now() - n * interval '8 hours' end,
  case when n % 20 = 0 then 'Anotado dos veces' when n % 50 = 0 then 'corrección' end
from generate_series(1, 3285) as n;

insert into public.expenses (business_id, category_id, description, amount_cents, method, spent_at, replaces_id)
select e.business_id, e.category_id, e.description, e.amount_cents + 100, e.method, e.spent_at, e.id
from public.expenses e
where e.business_id = '00000000-0000-4000-a000-0000000009c4' and e.void_reason = 'corrección';

insert into public.expenses (business_id, category_id, amount_cents, method, spent_at)
select
  ('00000000-0000-4000-a000-' || lpad(to_hex(n), 12, '0'))::uuid,
  ('00000000-0000-4000-f000-' || lpad(to_hex(n * 10 + 1), 12, '0'))::uuid,
  1000, 'cash', now() - k * interval '1 day'
from generate_series(1, 5000) as n, generate_series(1, 3) as k
where n <> 2500;

insert into public.manual_incomes (business_id, description, amount_cents, method, received_at, voided_at, void_reason)
select
  '00000000-0000-4000-a000-0000000009c4', 'Ingreso ' || d || ' (DEMO)', 1500, (array['cash', 'yape'])[1 + d % 2],
  now() - d * interval '1 day' + interval '3 hours',
  case when d % 30 = 0 then now() - d * interval '1 day' end,
  case when d % 30 = 0 then 'Anotado dos veces' end
from generate_series(1, 1095) as d;

insert into public.manual_incomes (business_id, description, amount_cents, method, received_at)
select ('00000000-0000-4000-a000-' || lpad(to_hex(n), 12, '0'))::uuid, 'Ingreso (DEMO)', 1000, 'cash', now() - interval '2 days'
from generate_series(1, 5000) as n
where n <> 2500;

insert into public.cash_counts (business_id, business_date, opening_cents, cash_in_cents, cash_out_cents, expected_cents,
  counted_cents, difference_cents, closed_at)
select
  '00000000-0000-4000-a000-0000000009c4', (now() at time zone 'America/Lima')::date - d, 5000, 10000, 3000, 12000,
  12000 - d % 7 * 100, -(d % 7 * 100), now() - d * interval '1 day'
from generate_series(1, 1095) as d;

analyze public.payments;
analyze public.expense_categories;
analyze public.expenses;
analyze public.manual_incomes;
analyze public.cash_counts;
