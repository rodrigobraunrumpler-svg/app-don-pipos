-- Clientes: buscar sin tildes y por teléfono, «Todos», «Los que más compran» y «No vuelven», la ficha, corregir sus datos,
-- borrarlos (Ley 29733) y sus pedidos (docs/spec/customers.md §3). Se lee con las reglas de acceso; se escribe solo por
-- funciones de private

create extension if not exists pg_trgm with schema extensions;
create extension if not exists btree_gin with schema extensions;
create extension if not exists unaccent with schema extensions;

-- En minúsculas y sin tildes, para que «lucia» encuentre «Lucía». Inmutable para poder indexarla
create function private.search_text(p_text text) returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
$$;

-- Lo que se busca de un cliente: su nombre así y su teléfono
create function private.customer_search(p_name text, p_phone text) returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select private.search_text(p_name) || ' ' || coalesce(p_phone, '');
$$;

create index customers_search_idx on public.customers
  using gin (business_id, private.customer_search(name, phone) extensions.gin_trgm_ops);
-- «Los que más compran» y «Todos» / «No vuelven», con el id para seguir por páginas
create index customers_business_id_spent_cents_idx on public.customers (business_id, spent_cents desc, id desc);
create index customers_business_id_last_order_at_idx on public.customers (business_id, last_order_at desc nulls last, id desc);

-- La ficha del cliente: sus datos, sus totales, sus sellos y su favorito (el alfajor que más pide, sin anulados; si
-- empatan, por nombre). Con las reglas de acceso de quien la lee
create function private.customer_json(p_customer_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'phone', c.phone,
    'address', c.address,
    'note', c.note,
    'acceptsPromotions', c.accepts_promotions,
    'ordersCount', c.orders_count,
    'spentCents', c.spent_cents::integer,
    'lastOrderAt', private.iso_time(c.last_order_at),
    'stamps', c.stamps,
    'favorite', (
      select jsonb_build_object('productId', f.product_id, 'name', f.name)
      from (
        select l.product_id, coalesce(max(p.name), max(l.product_name)) as name, sum(l.quantity) as units
        from public.orders o
        join public.order_lines l on l.business_id = o.business_id and l.order_id = o.id
        left join public.products p on p.business_id = l.business_id and p.id = l.product_id
        where o.business_id = c.business_id and o.customer_id = c.id and o.status <> 'cancelled'
        group by l.product_id
        order by 3 desc, lower(coalesce(max(p.name), max(l.product_name)))
        limit 1
      ) f
    ),
    'anonymizedAt', private.iso_time(c.anonymized_at),
    'version', c.version
  )
  from public.customers c
  where c.id = p_customer_id;
$$;

create function public.get_customer(p_id uuid) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_customer jsonb := private.customer_json(p_id);
begin
  if v_customer is null then
    perform private.fail('not_found');
  end if;
  return v_customer;
end;
$$;

-- Buscar por nombre (sin tildes) o por teléfono (solo dígitos, con o sin 51), en «Todos» (por último pedido), «Los que
-- más compran» (por lo gastado) o «No vuelven» (sin pedir hace más de lapsed_after_days, del más reciente al más viejo).
-- De 20 en 20: el cursor es «valor~id» del último de la página. Sin los clientes borrados
create function public.search_customers(p_q text, p_filter text, p_limit integer default 20, p_cursor text default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_limit integer := coalesce(p_limit, 20);
  v_q text := nullif(btrim(p_q), '');
  v_digits text;
  v_pattern text;
  v_lapsed_before timestamptz;
  v_cursor_value text := split_part(p_cursor, '~', 1);
  v_cursor_id uuid;
  v_where text;
  v_after text;
  v_order text;
  v_total integer;
  v_items jsonb;
  v_has_more boolean;
  v_last jsonb;
begin
  if p_filter is null or p_filter not in ('all', 'top', 'lapsed') or v_limit < 1
    or (p_cursor is not null and (p_cursor !~ '^[^~]*~[0-9a-f-]{36}$'
      or (p_filter = 'top' and v_cursor_value !~ '^[0-9]{1,12}$'))) then
    perform private.fail('invalid');
  end if;
  v_limit := least(v_limit, 50);
  if p_cursor is not null then
    v_cursor_id := split_part(p_cursor, '~', 2)::uuid;
  end if;

  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;
  select now() - make_interval(days => s.lapsed_after_days) into v_lapsed_before
  from public.business_settings s where s.business_id = v_business_id;

  if v_q is not null then
    v_digits := regexp_replace(v_q, '[\s().+-]', '', 'g');
    -- «%» y «_» se buscan como letras
    v_pattern := '%' || replace(replace(replace(
      case when v_digits ~ '^[0-9]{3,11}$' then v_digits else private.search_text(v_q) end,
      '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  v_where := 'c.business_id = $1 and c.anonymized_at is null'
    || ' and ($2::text is null or private.customer_search(c.name, c.phone) like $2)'
    || case when p_filter = 'lapsed' then ' and c.last_order_at < $3' else '' end;
  if p_filter = 'top' then
    v_order := 'c.spent_cents desc, c.id desc';
    v_after := '($4::text is null or (c.spent_cents, c.id) < ($4::bigint, $5))';
  else
    v_order := 'c.last_order_at desc nulls last, c.id desc';
    v_after := '($4::text is null or (case when $4 = '''' then c.last_order_at is null and c.id < $5'
      || ' else c.last_order_at < $4::timestamptz or (c.last_order_at = $4::timestamptz and c.id < $5)'
      || ' or c.last_order_at is null end))';
  end if;

  execute 'select count(*)::integer from public.customers c where ' || v_where
  into v_total using v_business_id, v_pattern, v_lapsed_before;

  -- Se pide uno de más: si llega, hay otra página
  execute 'select coalesce(jsonb_agg(jsonb_build_object(
      ''id'', c.id, ''name'', c.name, ''phone'', c.phone, ''ordersCount'', c.orders_count,
      ''spentCents'', c.spent_cents::integer, ''lastOrderAt'', private.iso_time(c.last_order_at),
      ''acceptsPromotions'', c.accepts_promotions, ''cursorAt'', c.last_order_at
    ) order by ' || v_order || '), ''[]'')
    from (select c.* from public.customers c where ' || v_where || ' and ' || v_after
    || ' order by ' || v_order || ' limit $6) c'
  into v_items using v_business_id, v_pattern, v_lapsed_before, v_cursor_value, v_cursor_id, v_limit + 1;

  v_has_more := jsonb_array_length(v_items) > v_limit;
  if v_has_more then
    v_items := v_items - v_limit;
  end if;
  v_last := v_items -> -1;
  return jsonb_build_object(
    'items', (select coalesce(jsonb_agg(e - 'cursorAt'), '[]'::jsonb) from jsonb_array_elements(v_items) as e),
    'meta', jsonb_build_object(
      'limit', v_limit,
      'total', v_total,
      'hasMore', v_has_more,
      'nextCursor', case when v_has_more then
        case when p_filter = 'top' then v_last ->> 'spentCents' else coalesce(v_last ->> 'cursorAt', '') end
        || '~' || (v_last ->> 'id') end
    )
  );
end;
$$;

-- Corregir sus datos: nombre de 1 a 60 caracteres; dirección y nota vacías quedan sin valor. Con otra versión, conflict;
-- un cliente borrado no se corrige
create function private.update_customer(
  p_customer_id uuid, p_expected_version integer, p_name text, p_address text, p_note text, p_accepts_promotions boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_customer public.customers%rowtype;
  v_name text := btrim(p_name);
  v_address text := nullif(btrim(p_address), '');
  v_note text := nullif(btrim(p_note), '');
begin
  select c.* into v_customer from public.customers c
  where c.business_id = v_business_id and c.id = p_customer_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_customer.anonymized_at is not null or p_accepts_promotions is null or coalesce(length(v_name), 0) not between 1 and 60
    or length(v_address) > 200 or length(v_note) > 300 then
    perform private.fail('invalid');
  end if;
  if v_customer.version is distinct from p_expected_version then
    perform private.fail('conflict');
  end if;
  update public.customers
  set name = v_name, address = v_address, note = v_note, accepts_promotions = p_accepts_promotions, version = version + 1
  where id = p_customer_id;
  return private.customer_json(p_customer_id);
end;
$$;

create function public.update_customer(
  p_id uuid, p_expected_version integer, p_name text, p_address text, p_note text, p_accepts_promotions boolean
) returns jsonb
language sql
set search_path = ''
as $$
  select private.update_customer(p_id, p_expected_version, p_name, p_address, p_note, p_accepts_promotions);
$$;

-- Borrar sus datos, a su pedido (Ley 29733): su nombre pasa a «Cliente eliminado» y quedan sin teléfono, dirección, nota
-- ni permiso de promociones. En sus pedidos, lo mismo: «Cliente eliminado», «Dirección eliminada» en los deliverys (un
-- delivery necesita una) y sin nota. Los pedidos y sus montos quedan: los números del negocio no cambian. Una segunda vez
-- devuelve lo mismo
create function private.anonymize_customer(p_customer_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_customer public.customers%rowtype;
begin
  select c.* into v_customer from public.customers c
  where c.business_id = v_business_id and c.id = p_customer_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_customer.anonymized_at is null then
    update public.customers
    set name = 'Cliente eliminado', phone = null, address = null, note = null, accepts_promotions = false,
        anonymized_at = now(), version = version + 1
    where id = p_customer_id;
    update public.orders o
    set customer_name = 'Cliente eliminado',
        delivery_address = case when o.delivery_address is null then null else 'Dirección eliminada' end,
        note = null,
        version = o.version + 1
    where o.business_id = v_business_id and o.customer_id = p_customer_id;
  end if;
  return private.customer_json(p_customer_id);
end;
$$;

create function public.anonymize_customer(p_id uuid) returns jsonb
language sql
set search_path = ''
as $$
  select private.anonymize_customer(p_id);
$$;

-- Los pedidos de un cliente, del más nuevo al más viejo, de 20 en 20, con la forma de list_orders
create function public.list_customer_orders(p_customer_id uuid, p_limit integer default 20, p_cursor text default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_limit integer := coalesce(p_limit, 20);
  v_total integer;
  v_items jsonb;
  v_has_more boolean;
begin
  if p_customer_id is null or v_limit < 1 or p_cursor !~ '^[0-9]{1,9}$' then
    perform private.fail('invalid');
  end if;
  v_limit := least(v_limit, 50);
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select count(*)::integer into v_total from public.orders o
  where o.business_id = v_business_id and o.customer_id = p_customer_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'number', o.number, 'status', o.status, 'fulfillment', o.fulfillment,
      'customerName', o.customer_name, 'itemsSummary', o.items_summary, 'totalCents', o.total_cents,
      'paidCents', o.paid_cents, 'promisedAt', private.iso_time(o.promised_at), 'dueDate', o.due_date
    ) order by o.number desc), '[]')
  into v_items
  from (
    select o.* from public.orders o
    where o.business_id = v_business_id and o.customer_id = p_customer_id
      and (p_cursor is null or o.number < p_cursor::integer)
    order by o.number desc
    limit v_limit + 1
  ) o;

  v_has_more := jsonb_array_length(v_items) > v_limit;
  if v_has_more then
    v_items := v_items - v_limit;
  end if;
  return jsonb_build_object(
    'items', v_items,
    'meta', jsonb_build_object(
      'limit', v_limit,
      'total', v_total,
      'hasMore', v_has_more,
      'nextCursor', case when v_has_more then v_items -> -1 ->> 'number' end
    )
  );
end;
$$;

-- El cliente de un teléfono, ahora con sus sellos (para «tiene su premio listo» en el paso 2 del pedido)
create or replace function public.find_customer_by_phone(p_phone text) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'address', c.address,
    'ordersCount', c.orders_count,
    'lastOrderAt', private.iso_time(c.last_order_at),
    'stamps', c.stamps,
    'lastOrder', (
      select jsonb_build_object('lines', (
        select jsonb_agg(jsonb_build_object('productId', l.product_id, 'quantity', l.quantity) order by lower(l.product_name), l.product_id)
        from public.order_lines l where l.business_id = o.business_id and l.order_id = o.id
      ))
      from public.orders o
      where o.business_id = c.business_id and o.customer_id = c.id and o.status <> 'cancelled'
      order by o.created_at desc, o.number desc
      limit 1
    )
  )
  from public.customers c
  where c.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1) and c.phone = p_phone;
$$;

-- La búsqueda y la ficha las llaman las lecturas con las reglas de acceso de quien lee
grant execute on function private.search_text(text), private.customer_search(text, text), private.customer_json(uuid),
  private.update_customer(uuid, integer, text, text, text, boolean), private.anonymize_customer(uuid),
  public.get_customer(uuid), public.search_customers(text, text, integer, text),
  public.update_customer(uuid, integer, text, text, text, boolean), public.anonymize_customer(uuid),
  public.list_customer_orders(uuid, integer, text) to authenticated;
