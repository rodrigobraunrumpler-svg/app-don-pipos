-- Leer pedidos, clientes y plantillas (docs/spec/orders.md §3, customers.md §3 y messages.md). Con las reglas de acceso:
-- cada dueño ve solo lo suyo. Eligen el negocio como get_business.

-- Un pedido como lo ve la app (el mismo que devuelven las funciones que escriben)
create function public.get_order(p_order_id uuid) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_order jsonb := private.order_json(p_order_id);
begin
  if v_order is null then
    perform private.fail('not_found');
  end if;
  return v_order;
end;
$$;

-- La lista por páginas, del número mayor al menor. Los filtros van por el día de Lima (due_date):
-- today: los de hoy más los atrasados sin entregar; to_deliver: sin entregar ni anular, de hoy o atrasados;
-- upcoming: de días que vienen, sin anular; to_collect: con saldo, sin anular; all: todos.
-- p_search: «#0042» o «42» busca el número; otra cosa, el nombre del cliente. El cursor es el número del último, como texto.
-- Cada filtro arma su consulta: así cada uno usa su índice (los de pedidos en curso y por cobrar son parciales)
create function public.list_orders(p_filter text, p_search text default null, p_limit integer default 20, p_cursor text default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_today date := (now() at time zone 'America/Lima')::date;
  v_limit integer := coalesce(p_limit, 20);
  v_search text := nullif(btrim(p_search), '');
  v_where text;
  v_number integer;
  v_pattern text;
  v_total integer;
  v_items jsonb;
  v_has_more boolean;
begin
  v_where := case p_filter
    when 'today' then '(o.due_date = $2 or (o.due_date < $2 and o.status not in (''delivered'', ''cancelled'')))'
    when 'to_deliver' then 'o.status not in (''delivered'', ''cancelled'') and o.due_date <= $2'
    when 'upcoming' then 'o.due_date > $2 and o.status <> ''cancelled'''
    when 'to_collect' then 'o.paid_cents < o.total_cents and o.status <> ''cancelled'''
    when 'all' then 'true'
  end;
  if v_where is null or v_limit < 1 or p_cursor !~ '^[0-9]{1,9}$' then
    perform private.fail('invalid');
  end if;
  v_limit := least(v_limit, 50);
  if v_search ~ '^#?[0-9]{1,9}$' then
    v_number := ltrim(v_search, '#')::integer;
  elsif v_search is not null then
    -- «%» y «_» se buscan como letras
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  v_where := 'o.business_id = $1 and ' || v_where
    || ' and ($3::integer is null or o.number = $3) and ($4::text is null or o.customer_name ilike $4)';

  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  execute 'select count(*)::integer from public.orders o where ' || v_where
  into v_total using v_business_id, v_today, v_number, v_pattern;

  -- Se pide uno de más: si llega, hay otra página
  execute 'select coalesce(jsonb_agg(jsonb_build_object(
      ''id'', o.id, ''number'', o.number, ''status'', o.status, ''fulfillment'', o.fulfillment,
      ''customerName'', o.customer_name, ''itemsSummary'', o.items_summary, ''totalCents'', o.total_cents,
      ''paidCents'', o.paid_cents, ''promisedAt'', private.iso_time(o.promised_at), ''dueDate'', o.due_date
    ) order by o.number desc), ''[]'')
    from (
      select o.* from public.orders o where ' || v_where || ' and ($5::integer is null or o.number < $5)
      order by o.number desc limit $6
    ) o'
  into v_items using v_business_id, v_today, v_number, v_pattern, p_cursor::integer, v_limit + 1;

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

-- Cuántos hay en cada filtro, para los chips. Cuenta con list_orders: «Por entregar» de Inicio y la lista dan el mismo número
create function public.order_counts() returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_object_agg(f.key, public.list_orders(f.filter, null, 1) -> 'meta' -> 'total')
  from (values ('today', 'today'), ('toDeliver', 'to_deliver'), ('upcoming', 'upcoming'), ('toCollect', 'to_collect'), ('all', 'all'))
    as f (key, filter);
$$;

-- El cliente de un teléfono (ya normalizado, +51…), para completar el nombre y «Repetir» su último pedido sin anular.
-- Sin cliente, null
create function public.find_customer_by_phone(p_phone text) returns jsonb
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

-- Los textos de WhatsApp del negocio
create function public.list_templates() returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', t.key, 'body', t.body, 'version', t.version) order by t.key), '[]'::jsonb)
  from public.message_templates t
  where t.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1);
$$;

grant execute on function public.get_order(uuid) to authenticated;
grant execute on function public.list_orders(text, text, integer, text) to authenticated;
grant execute on function public.order_counts() to authenticated;
grant execute on function public.find_customer_by_phone(text) to authenticated;
grant execute on function public.list_templates() to authenticated;
-- Las lecturas arman el pedido y las fechas con las reglas de acceso de quien llama
grant execute on function private.order_json(uuid) to authenticated;
grant execute on function private.iso_time(timestamptz) to authenticated;
