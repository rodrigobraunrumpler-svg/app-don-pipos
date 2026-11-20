-- Inicio y reportes (docs/spec/reports.md §3): lecturas, sin tablas propias. Leen con las reglas de acceso de quien lee
-- y cortan los días a las 00:00 de Lima. Ingresos por fecha de pago (con las devoluciones en su día); ventas y ranking
-- por fecha de entrega (D11); nada anulado cuenta.

-- Lo que entró, lo que se gastó y la ganancia entre dos días de Lima (incluidos)
create function private.report_totals(p_business_id uuid, p_from date, p_to date) returns jsonb
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select p_from::timestamp at time zone 'America/Lima' as start_at,
           (p_to + 1)::timestamp at time zone 'America/Lima' as end_at
  ), totals as (
    select
      coalesce((select sum(r.amount_cents) from bounds, private.income_rows(p_business_id, bounds.start_at, bounds.end_at) as r), 0)::integer
        as income,
      coalesce((
        select sum(e.amount_cents) from bounds, public.expenses e
        where e.business_id = p_business_id and e.voided_at is null and e.spent_at >= bounds.start_at and e.spent_at < bounds.end_at
      ), 0)::integer as spent
  )
  select jsonb_build_object('incomeCents', t.income, 'expensesCents', t.spent, 'profitCents', t.income - t.spent)
  from totals t;
$$;

-- Inicio: lo cobrado hoy por medio, los entregados hoy, por entregar (el mismo número que el filtro de Pedidos), lo que te
-- deben y si el cuadre de hoy ya tiene un cierre
create function public.home_summary() returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_today date := (now() at time zone 'America/Lima')::date;
  v_start timestamptz := (now() at time zone 'America/Lima')::date::timestamp at time zone 'America/Lima';
  v_end timestamptz := ((now() at time zone 'America/Lima')::date + 1)::timestamp at time zone 'America/Lima';
  v_result jsonb;
begin
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  with income as (
    select r.* from private.income_rows(v_business_id, v_start, v_end) as r
  )
  select jsonb_build_object(
    'collectedTodayCents', coalesce((select sum(i.amount_cents) from income i), 0)::integer,
    'collectedByMethod', jsonb_build_object(
      'cash', coalesce((select sum(i.amount_cents) from income i where i.method = 'cash'), 0)::integer,
      'yape', coalesce((select sum(i.amount_cents) from income i where i.method = 'yape'), 0)::integer,
      'plin', coalesce((select sum(i.amount_cents) from income i where i.method = 'plin'), 0)::integer,
      'transfer', coalesce((select sum(i.amount_cents) from income i where i.method = 'transfer'), 0)::integer
    ),
    'deliveredToday', (
      select count(*)::integer from public.orders o
      where o.business_id = v_business_id and o.status = 'delivered' and o.delivered_at >= v_start and o.delivered_at < v_end
    ),
    'toDeliver', coalesce((public.order_counts() ->> 'toDeliver')::integer, 0),
    'receivablesCents', (
      select coalesce(sum(o.total_cents - o.paid_cents), 0)::integer from public.orders o
      where o.business_id = v_business_id and o.paid_cents < o.total_cents and o.status <> 'cancelled'
    ),
    'cashClosedToday', exists (
      select 1 from public.cash_counts c where c.business_id = v_business_id and c.business_date = v_today
    )
  )
  into v_result;
  return v_result;
end;
$$;

-- Un periodo de hasta un año frente al anterior (el mismo largo, termina el día antes), sus barras y lo cobrado por
-- medio. Las barras van por día hasta 7 días, por semana del periodo hasta 62 y por mes en un rango más largo; la base
-- da el desde, el hasta y los montos, y el texto lo arma la app
create function public.report_summary(p_from date, p_to date) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_days integer;
  v_unit text;
  v_start timestamptz := p_from::timestamp at time zone 'America/Lima';
  v_end timestamptz := (p_to + 1)::timestamp at time zone 'America/Lima';
  v_bars jsonb;
  v_by_method jsonb;
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 365 then
    perform private.fail('invalid');
  end if;
  v_days := p_to - p_from + 1;
  v_unit := case when v_days <= 7 then 'day' when v_days <= 62 then 'week' else 'month' end;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  with buckets as (
    select
      case v_unit when 'month' then greatest(date_trunc('month', g)::date, p_from) else g::date end as b_from,
      case v_unit
        when 'day' then g::date
        when 'week' then least(g::date + 6, p_to)
        else least((date_trunc('month', g) + interval '1 month' - interval '1 day')::date, p_to)
      end as b_to
    from generate_series(
      case v_unit when 'month' then date_trunc('month', p_from::timestamp) else p_from::timestamp end,
      p_to::timestamp,
      case v_unit when 'day' then interval '1 day' when 'week' then interval '7 days' else interval '1 month' end
    ) as g
  ), income as (
    select (r.at at time zone 'America/Lima')::date as day, r.method, r.amount_cents
    from private.income_rows(v_business_id, v_start, v_end) as r
  ), spent as (
    select (e.spent_at at time zone 'America/Lima')::date as day, e.amount_cents
    from public.expenses e
    where e.business_id = v_business_id and e.voided_at is null and e.spent_at >= v_start and e.spent_at < v_end
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'from', b.b_from,
      'to', b.b_to,
      'incomeCents', coalesce((select sum(i.amount_cents) from income i where i.day between b.b_from and b.b_to), 0)::integer,
      'expensesCents', coalesce((select sum(s.amount_cents) from spent s where s.day between b.b_from and b.b_to), 0)::integer
    ) order by b.b_from), '[]'::jsonb),
    jsonb_build_object(
      'cash', coalesce((select sum(i.amount_cents) from income i where i.method = 'cash'), 0)::integer,
      'yape', coalesce((select sum(i.amount_cents) from income i where i.method = 'yape'), 0)::integer,
      'plin', coalesce((select sum(i.amount_cents) from income i where i.method = 'plin'), 0)::integer,
      'transfer', coalesce((select sum(i.amount_cents) from income i where i.method = 'transfer'), 0)::integer
    )
  into v_bars, v_by_method
  from buckets b;

  return private.report_totals(v_business_id, p_from, p_to) || jsonb_build_object(
    'previous', private.report_totals(v_business_id, p_from - v_days, p_from - 1),
    'bars', v_bars,
    'byMethod', v_by_method
  );
end;
$$;

-- Más vendidos: por alfajor (unidades, soles y la ganancia con el costo guardado en cada línea; sin costo, sin
-- ganancia), los pedidos por canal y los clientes que más compran. De los pedidos entregados en el periodo, por fecha de
-- entrega; uno entregado y después anulado ya no está entregado
create function public.report_ranking(p_from date, p_to date) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_start timestamptz := p_from::timestamp at time zone 'America/Lima';
  v_end timestamptz := (p_to + 1)::timestamp at time zone 'America/Lima';
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 365 then
    perform private.fail('invalid');
  end if;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  with delivered as (
    select o.id, o.channel, o.customer_id, o.customer_name, o.total_cents
    from public.orders o
    where o.business_id = v_business_id and o.status = 'delivered' and o.delivered_at >= v_start and o.delivered_at < v_end
  ), sold as (
    select l.product_id, max(l.product_name) as line_name, sum(l.quantity)::integer as units,
      sum(l.quantity * l.unit_price_cents)::integer as sales,
      case when count(*) filter (where l.unit_cost_cents is null) = 0
        then sum(l.quantity * (l.unit_price_cents - l.unit_cost_cents))::integer end as profit
    from delivered d
    join public.order_lines l on l.business_id = v_business_id and l.order_id = d.id
    group by l.product_id
  ), buyers as (
    select d.customer_id, max(d.customer_name) as name, count(*)::integer as orders, sum(d.total_cents)::integer as spent
    from delivered d
    where d.customer_id is not null
    group by d.customer_id
    order by 4 desc, 2
    limit 5
  )
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', s.product_id,
        'name', coalesce(p.name, s.line_name),
        'imageUrl', p.image_url,
        'units', s.units,
        'salesCents', s.sales,
        'costCents', p.cost_cents::integer,
        'profitCents', s.profit
      ) order by s.units desc, s.sales desc, lower(coalesce(p.name, s.line_name)))
      from sold s
      left join public.products p on p.business_id = v_business_id and p.id = s.product_id
    ), '[]'::jsonb),
    'channels', jsonb_build_object(
      'whatsapp', (select count(*)::integer from delivered d where d.channel = 'whatsapp'),
      'local', (select count(*)::integer from delivered d where d.channel = 'local'),
      'web', (select count(*)::integer from delivered d where d.channel = 'web')
    ),
    'topCustomers', coalesce((
      select jsonb_agg(jsonb_build_object('customerId', b.customer_id, 'name', b.name, 'orders', b.orders, 'spentCents', b.spent)
        order by b.spent desc, b.name)
      from buyers b
    ), '[]'::jsonb)
  )
  into v_result;
  return v_result;
end;
$$;

-- Para Excel: los pedidos del periodo (por su día), los pagos y las devoluciones, los gastos y los ingresos a mano, sin
-- anulados (un pedido anulado va con su estado), del más viejo al más nuevo. Hasta un año
create function public.export_rows(p_from date, p_to date) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_start timestamptz := p_from::timestamp at time zone 'America/Lima';
  v_end timestamptz := (p_to + 1)::timestamp at time zone 'America/Lima';
  v_rows jsonb;
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 365 then
    perform private.fail('invalid');
  end if;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select coalesce(jsonb_agg(x.row order by x.at, x.kind, x.id), '[]'::jsonb)
  into v_rows
  from (
    select o.created_at as at, 'order' as kind, o.id, jsonb_build_object(
      'kind', 'order', 'at', private.iso_time(o.created_at), 'orderNumber', o.number, 'customerName', o.customer_name,
      'detail', o.items_summary, 'method', null::text, 'amountCents', o.total_cents::integer, 'status', o.status
    ) as row
    from public.orders o
    where o.business_id = v_business_id and o.due_date between p_from and p_to
    union all
    select p.paid_at, (case when p.kind = 'refund' then 'refund' else 'payment' end), p.id, jsonb_build_object(
      'kind', case when p.kind = 'refund' then 'refund' else 'payment' end, 'at', private.iso_time(p.paid_at),
      'orderNumber', o.number, 'customerName', o.customer_name, 'detail', null::text, 'method', p.method,
      'amountCents', p.amount_cents::integer, 'status', null::text
    )
    from public.payments p
    join public.orders o on o.business_id = p.business_id and o.id = p.order_id
    where p.business_id = v_business_id and p.voided_at is null and p.paid_at >= v_start and p.paid_at < v_end
    union all
    select e.spent_at, 'expense', e.id, jsonb_build_object(
      'kind', 'expense', 'at', private.iso_time(e.spent_at), 'orderNumber', null::integer, 'customerName', null::text,
      'detail', c.name || coalesce(': ' || e.description, ''), 'method', e.method, 'amountCents', e.amount_cents::integer,
      'status', null::text
    )
    from public.expenses e
    join public.expense_categories c on c.business_id = e.business_id and c.id = e.category_id
    where e.business_id = v_business_id and e.voided_at is null and e.spent_at >= v_start and e.spent_at < v_end
    union all
    select m.received_at, 'income', m.id, jsonb_build_object(
      'kind', 'income', 'at', private.iso_time(m.received_at), 'orderNumber', null::integer, 'customerName', null::text,
      'detail', m.description, 'method', m.method, 'amountCents', m.amount_cents::integer, 'status', null::text
    )
    from public.manual_incomes m
    where m.business_id = v_business_id and m.voided_at is null and m.received_at >= v_start and m.received_at < v_end
  ) as x;
  return v_rows;
end;
$$;

grant execute on function public.home_summary() to authenticated;
grant execute on function public.report_summary(date, date) to authenticated;
grant execute on function public.report_ranking(date, date) to authenticated;
grant execute on function public.export_rows(date, date) to authenticated;
-- Las lecturas de arriba la llaman con las reglas de acceso de quien lee
grant execute on function private.report_totals(uuid, date, date) to authenticated;
