-- La venta esperada (D16, docs/spec/stock.md §3): cuánto se vende cada día de la semana. De ahí salen la sugerencia de
-- producción con su porqué, hasta cuándo alcanza cada alfajor (y el estado «poco») y el gráfico «Cómo se vende».
-- Cuenta desde mañana, como la maqueta; la historia termina ayer y empieza en la primera venta, hasta 4 semanas atrás.

-- Por alfajor activo y día de la semana (ISO: 1 lunes … 7 domingo), el promedio de lo vendido ese día en la historia.
-- Solo pedidos del mismo día y sin anular (los pedidos para otro día ya restaron lo libre). Con menos de 7 días, nada
create function private.expected_sales(p_business_id uuid) returns table (product_id uuid, dow integer, average numeric)
language sql
stable
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'America/Lima')::date as day
  ), span as (
    select greatest(t.day - 28, f.day) as start_day, t.day - 1 as end_day
    from today t,
         (select min(o.due_date) as day from public.orders o where o.business_id = p_business_id and o.status <> 'cancelled') f
    where f.day is not null and (t.day - 1) - greatest(t.day - 28, f.day) + 1 >= 7
  ), days as (
    select extract(isodow from d)::integer as dow, count(*)::integer as times
    from span s, generate_series(s.start_day, s.end_day, interval '1 day') as d
    group by 1
  ), sold as (
    select l.product_id, extract(isodow from o.due_date)::integer as dow, sum(l.quantity)::numeric as units
    from span s
    join public.orders o on o.business_id = p_business_id and o.due_date between s.start_day and s.end_day
      and o.status <> 'cancelled' and o.scheduled_for is null
    join public.order_lines l on l.business_id = o.business_id and l.order_id = o.id
    group by 1, 2
  )
  select p.id, d.dow, coalesce(s.units, 0) / d.times
  from days d
  cross join public.products p
  left join sold s on s.product_id = p.id and s.dow = d.dow
  where p.business_id = p_business_id and p.is_active;
$$;

-- La sugerencia: para los días de producción desde mañana, la venta esperada más el mínimo menos lo libre, redondeada
-- hacia arriba y nunca negativa. Devuelve el porqué («Por qué 36»). Sin historia: ready falso y sin alfajores
create function public.production_suggestion() returns jsonb
language sql
stable
set search_path = ''
as $$
  with business as (
    select b.id from public.businesses b order by b.created_at, b.id limit 1
  ), settings as (
    select s.production_interval_days as horizon from business join public.business_settings s on s.business_id = business.id
  ), expected as (
    select e.* from business, private.expected_sales(business.id) as e
  ), horizon as (
    select extract(isodow from d)::integer as dow
    from settings, generate_series(
      (now() at time zone 'America/Lima')::date + 1, (now() at time zone 'America/Lima')::date + settings.horizon, interval '1 day'
    ) as d
  ), totals as (
    select e.product_id,
           ceil(sum(e.average))::integer as expected,
           coalesce(sum(e.average) filter (where h.dow <= 5), 0) as weekday_units,
           count(*) filter (where h.dow <= 5)::integer as weekday_days,
           coalesce(sum(e.average) filter (where h.dow >= 6), 0) as weekend_units,
           count(*) filter (where h.dow >= 6)::integer as weekend_days
    from horizon h
    join expected e on e.dow = h.dow
    group by e.product_id
  )
  select jsonb_build_object(
    'ready', exists (select 1 from expected),
    'horizonDays', (select horizon from settings),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', p.id,
        'name', p.name,
        'imageUrl', p.image_url,
        'suggested', greatest(0, t.expected + p.min_stock - coalesce(l.on_hand, 0)),
        'expected', t.expected,
        'weekdayUnits', round(t.weekday_units, 1),
        'weekdayDays', t.weekday_days,
        'weekendUnits', round(t.weekend_units, 1),
        'weekendDays', t.weekend_days,
        'minStock', p.min_stock,
        'onHand', coalesce(l.on_hand, 0)
      ) order by p.sort_order, lower(p.name), p.id)
      from totals t
      join public.products p on p.id = t.product_id
      left join public.stock_levels l on l.business_id = p.business_id and l.product_id = p.id
    ), '[]'::jsonb)
  );
$$;

-- «Cómo se vende»: el promedio de cada día de la semana de un alfajor, de las últimas 4 semanas
create function public.product_sales_by_weekday(p_product_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  with business as (
    select b.id from public.businesses b order by b.created_at, b.id limit 1
  ), expected as (
    select e.* from business, private.expected_sales(business.id) as e where e.product_id = p_product_id
  )
  select jsonb_build_object(
    'ready', exists (select 1 from expected),
    'days', coalesce(
      (select jsonb_agg(jsonb_build_object('dow', e.dow, 'average', round(e.average, 1)) order by e.dow) from expected e),
      '[]'::jsonb
    )
  );
$$;

-- El stock, ahora con hasta cuándo alcanza: los días desde mañana que cubre lo libre restando la venta esperada de cada
-- día (hasta 7; null sin historia). Alcanzar para un día o menos también es «poco»
create or replace function public.stock_overview() returns jsonb
language sql
stable
set search_path = ''
as $$
  with business as (
    select b.id from public.businesses b order by b.created_at, b.id limit 1
  ), expected as (
    select e.* from business, private.expected_sales(business.id) as e
  ), items as (
    select p.id, p.name, p.image_url, p.sanity_id, p.min_stock, p.sort_order,
      coalesce(l.on_hand, 0) as on_hand,
      coalesce(r.reserved, 0) as reserved
    from business
    join public.products p on p.business_id = business.id and p.is_active
    left join public.stock_levels l on l.business_id = p.business_id and l.product_id = p.id
    left join (
      select x.product_id, sum(x.reserved)::integer as reserved
      from business, private.reserved_stock(business.id) as x
      group by x.product_id
    ) r on r.product_id = p.id
  ), coverage as (
    select c.product_id, (count(*) filter (where c.cumulative <= i.on_hand))::integer as days
    from (
      select e.product_id, sum(e.average) over (partition by e.product_id order by h.d) as cumulative
      from expected e
      join (
        select d, extract(isodow from (now() at time zone 'America/Lima')::date + d)::integer as dow
        from generate_series(1, 7) as d
      ) h on h.dow = e.dow
    ) c
    join items i on i.id = c.product_id
    group by c.product_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'productId', i.id,
    'name', i.name,
    'imageUrl', i.image_url,
    'linkedToWeb', i.sanity_id is not null,
    'minStock', i.min_stock,
    'onHand', i.on_hand,
    'reserved', i.reserved,
    'physical', i.on_hand + i.reserved,
    'coverageDays', c.days,
    'state', case
      when i.on_hand + i.reserved < 0 then 'check'
      when i.on_hand < 0 then 'owed'
      when i.on_hand = 0 then 'out'
      when i.on_hand <= i.min_stock or c.days <= 1 then 'low'
      else 'ok'
    end
  ) order by i.sort_order, lower(i.name), i.id), '[]'::jsonb)
  from items i
  left join coverage c on c.product_id = i.id;
$$;

grant execute on function public.production_suggestion() to authenticated;
grant execute on function public.product_sales_by_weekday(uuid) to authenticated;
-- Las lecturas de arriba la llaman con las reglas de acceso de quien lee
grant execute on function private.expected_sales(uuid) to authenticated;
