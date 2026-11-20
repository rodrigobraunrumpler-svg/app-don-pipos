-- El texto de búsqueda de cada cliente se guarda al escribir (su nombre sin tildes y en minúsculas, y su teléfono): al
-- revisar los candidatos del índice ya no se recalcula unaccent cliente por cliente. Una búsqueda que encuentra a miles
-- («lucia» en «No vuelven») tardaba unos 100 ms con 30,000 clientes
alter table public.customers
  add column search_text text generated always as (private.customer_search(name, phone)) stored;
create index customers_search_text_idx on public.customers using gin (business_id, search_text extensions.gin_trgm_ops);
drop index public.customers_search_idx;

create or replace function private.search_customers(p_q text, p_filter text, p_limit integer, p_cursor text)
returns jsonb
language plpgsql
stable
security definer
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

  v_business_id := private.current_business_id();
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
    || ' and ($2::text is null or c.search_text like $2)'
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
