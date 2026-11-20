-- La ganancia por alfajor usa el costo guardado en cada venta y, si esa venta no tiene, el costo de hoy (el aproximado
-- que se pone en Productos): así aparece apenas el dueño pone sus costos. Sin ninguno de los dos, sin ganancia
create or replace function public.report_ranking(p_from date, p_to date) returns jsonb
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
      case when count(*) filter (where coalesce(l.unit_cost_cents, p.cost_cents) is null) = 0
        then sum(l.quantity * (l.unit_price_cents - coalesce(l.unit_cost_cents, p.cost_cents)))::integer end as profit
    from delivered d
    join public.order_lines l on l.business_id = v_business_id and l.order_id = d.id
    left join public.products p on p.business_id = v_business_id and p.id = l.product_id
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
