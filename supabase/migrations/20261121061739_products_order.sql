-- Fase 9 (docs/plan/fase-9-alfajores-web.md, tarea 3): el orden de los alfajores en la web, a mano o por los más
-- vendidos del mes; «Nuevo» que vence a los 30 días; y el enlace para pedir reseñas en Google

alter table public.business_settings
  add column products_by_sales boolean not null default false,
  add column review_url text constraint business_settings_review_url_https check (review_url ~ '^https://' and length(review_url) <= 300);

-- Los ajustes como los ve la app, con los dos nuevos
create or replace function private.settings_json(p_settings public.business_settings) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'activePaymentMethods', to_jsonb(p_settings.active_payment_methods),
    'deliveryFeeCents', p_settings.delivery_fee_cents::integer,
    'deliveryZone', p_settings.delivery_zone,
    'productionIntervalDays', p_settings.production_interval_days,
    'lapsedAfterDays', p_settings.lapsed_after_days,
    'reminders', p_settings.reminders,
    'productsBySales', p_settings.products_by_sales,
    'reviewUrl', p_settings.review_url,
    'version', p_settings.version
  );
$$;

-- Los alfajores activos del negocio por lo vendido (entregado) en los últimos 30 días; a igual venta, el orden de
-- antes. El estado de los que están en la web va a la web
create function private.order_products_by_sales(p_business_id uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  with sold as (
    select l.product_id, sum(l.quantity) as units
    from public.orders o
    join public.order_lines l on l.business_id = o.business_id and l.order_id = o.id
    where o.business_id = p_business_id and o.status = 'delivered' and o.delivered_at >= now() - interval '30 days'
    group by l.product_id
  ), ranked as (
    select p.id, row_number() over (order by coalesce(s.units, 0) desc, p.sort_order, p.id) as position
    from public.products p
    left join sold s on s.product_id = p.id
    where p.business_id = p_business_id and p.is_active
  )
  update public.products p
  set sort_order = r.position
  from ranked r
  where p.id = r.id and p.sort_order <> r.position;

  perform private.queue_web_sync(p.id) from public.products p
  where p.business_id = p_business_id and p.is_active and p.sanity_id is not null;
end;
$$;

-- Ordenar a mano (los ↑↓ de la app): los alfajores en ese orden. Devuelve la lista como queda
create function private.reorder_products(p_ids uuid[]) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
begin
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) as x) then
    perform private.fail('invalid');
  end if;
  if exists (
    select 1 from unnest(p_ids) as x
    where not exists (select 1 from public.products p where p.id = x and p.business_id = v_business_id and p.is_active)
  ) then
    perform private.fail('not_found');
  end if;

  update public.products p
  set sort_order = t.position
  from unnest(p_ids) with ordinality as t(id, position)
  where p.id = t.id and p.sort_order <> t.position;

  perform private.queue_web_sync(p.id) from public.products p
  where p.business_id = v_business_id and p.is_active and p.sanity_id is not null;

  return coalesce((
    select jsonb_agg(private.product_json(p) order by p.sort_order, lower(p.name), p.id)
    from public.products p where p.business_id = v_business_id and p.is_active
  ), '[]'::jsonb);
end;
$$;

create function public.reorder_products(p_ids uuid[]) returns jsonb
language sql
set search_path = ''
as $$
  select private.reorder_products(p_ids);
$$;

grant execute on function public.reorder_products(uuid[]), private.reorder_products(uuid[]) to authenticated;

-- «Nuevo» vence a los 30 días: ese día se manda el estado de esos alfajores, ya sin la etiqueta
create function private.expire_new_badges() returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform private.queue_web_sync(p.id) from public.products p
  where p.web_published_at <= now() - interval '30 days' and p.web_published_at > now() - interval '31 days'
    and p.sanity_id is not null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Cada día a las 08:45 UTC (03:45 de Lima) vencen las etiquetas, y el día 1 de cada mes a las 08:30 se ordena por lo
-- vendido en los negocios que lo pidieron
select cron.schedule('expire-new-badges', '45 8 * * *', 'select private.expire_new_badges()');
select cron.schedule('order-products-by-sales', '30 8 1 * *',
  'select private.order_products_by_sales(s.business_id) from public.business_settings s where s.products_by_sales');

create or replace function private.update_settings(p_expected_version integer, p_patch jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_settings public.business_settings%rowtype;
  v_value jsonb;
  v_zone text;
begin
  select s.* into v_settings from public.business_settings s where s.business_id = v_business_id for update;

  if p_expected_version is null then
    perform private.fail('invalid');
  end if;
  if v_settings.version <> p_expected_version then
    perform private.fail('conflict');
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    perform private.fail('invalid');
  end if;
  if p_patch - array['activePaymentMethods', 'deliveryFeeCents', 'deliveryZone', 'productionIntervalDays', 'lapsedAfterDays', 'reminders',
       'productsBySales', 'reviewUrl']
     <> '{}'::jsonb then
    perform private.fail('invalid');
  end if;

  if p_patch ? 'activePaymentMethods' then
    v_value := p_patch -> 'activePaymentMethods';
    if jsonb_typeof(v_value) <> 'array' then
      perform private.fail('invalid');
    end if;
    if jsonb_array_length(v_value) not between 1 and 4
       or exists (
         select 1 from jsonb_array_elements(v_value) as e(method)
         where jsonb_typeof(e.method) <> 'string' or (e.method #>> '{}') not in ('cash', 'yape', 'plin', 'transfer')
       )
       or (select count(distinct e.method) from jsonb_array_elements(v_value) as e(method)) <> jsonb_array_length(v_value) then
      perform private.fail('invalid');
    end if;
    v_settings.active_payment_methods := array(
      select (e.method #>> '{}')::public.payment_method
      from jsonb_array_elements(v_value) with ordinality as e(method, position)
      order by e.position
    );
  end if;

  if p_patch ? 'deliveryFeeCents' then
    v_settings.delivery_fee_cents := private.json_integer(p_patch -> 'deliveryFeeCents', 0, 1000000);
  end if;
  if p_patch ? 'productionIntervalDays' then
    v_settings.production_interval_days := private.json_integer(p_patch -> 'productionIntervalDays', 1, 14);
  end if;
  if p_patch ? 'lapsedAfterDays' then
    v_settings.lapsed_after_days := private.json_integer(p_patch -> 'lapsedAfterDays', 7, 120);
  end if;

  if p_patch ? 'deliveryZone' then
    v_value := p_patch -> 'deliveryZone';
    if jsonb_typeof(v_value) not in ('string', 'null') then
      perform private.fail('invalid');
    end if;
    v_zone := nullif(btrim(v_value #>> '{}'), '');
    if length(v_zone) > 120 then
      perform private.fail('invalid');
    end if;
    v_settings.delivery_zone := v_zone;
  end if;

  if p_patch ? 'reminders' then
    v_value := p_patch -> 'reminders';
    if jsonb_typeof(v_value) <> 'object' then
      perform private.fail('invalid');
    end if;
    if not (v_value ?& array['scheduled', 'stock', 'balances'])
       or v_value - 'scheduled' - 'stock' - 'balances' <> '{}'::jsonb
       or jsonb_typeof(v_value -> 'scheduled') <> 'boolean'
       or jsonb_typeof(v_value -> 'stock') <> 'boolean'
       or jsonb_typeof(v_value -> 'balances') <> 'boolean' then
      perform private.fail('invalid');
    end if;
    v_settings.reminders := v_value;
  end if;

  if p_patch ? 'productsBySales' then
    if jsonb_typeof(p_patch -> 'productsBySales') <> 'boolean' then
      perform private.fail('invalid');
    end if;
    v_settings.products_by_sales := (p_patch ->> 'productsBySales')::boolean;
  end if;
  if p_patch ? 'reviewUrl' then
    v_value := p_patch -> 'reviewUrl';
    if jsonb_typeof(v_value) not in ('string', 'null') then
      perform private.fail('invalid');
    end if;
    v_zone := nullif(btrim(v_value #>> '{}'), '');
    if v_zone !~ '^https://[^\s]+$' or length(v_zone) > 300 then
      perform private.fail('invalid');
    end if;
    v_settings.review_url := v_zone;
  end if;

  update public.business_settings s
  set active_payment_methods = v_settings.active_payment_methods,
      delivery_fee_cents = v_settings.delivery_fee_cents,
      delivery_zone = v_settings.delivery_zone,
      production_interval_days = v_settings.production_interval_days,
      lapsed_after_days = v_settings.lapsed_after_days,
      reminders = v_settings.reminders,
      products_by_sales = v_settings.products_by_sales,
      review_url = v_settings.review_url,
      version = s.version + 1
  where s.business_id = v_business_id
  returning s.* into v_settings;

  -- Prender «los más vendidos primero» ordena al momento
  if v_settings.products_by_sales and p_patch ? 'productsBySales' then
    perform private.order_products_by_sales(v_business_id);
  end if;
  return private.settings_json(v_settings);
end;
$$;
