-- Las funciones del stock (docs/spec/stock.md §3). El stock es la suma de los movimientos: cada función crea movimientos
-- y suma a stock_levels en la misma operación, con move_stock. Leen con las reglas de acceso; escriben con la lógica en private.

-- Lo apartado para pedidos sin entregar ni anular, por alfajor.
-- Fase 4: los alfajores de los pedidos sin entregar ni anular. Hasta entonces no hay pedidos: no devuelve nada
create function private.reserved_stock(p_business_id uuid) returns table (product_id uuid, reserved integer)
language sql
stable
set search_path = ''
as $$
  select null::uuid, 0 where false;
$$;

-- Crea un movimiento y suma su cantidad al stock guardado (la fila se bloquea: dos movimientos del mismo alfajor van en fila).
-- Devuelve el stock nuevo. Si cruzó el cero, anota el estado para la web (solo si el producto está enlazado)
create function private.move_stock(
  p_business_id uuid, p_product_id uuid, p_kind text, p_quantity integer, p_reason text, p_request_id uuid, p_reverts uuid
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_on_hand integer;
begin
  insert into public.stock_movements (business_id, product_id, kind, quantity, reason, request_id, reverts_movement_id)
  values (p_business_id, p_product_id, p_kind, p_quantity, p_reason, p_request_id, p_reverts);

  insert into public.stock_levels as l (business_id, product_id, on_hand)
  values (p_business_id, p_product_id, p_quantity)
  on conflict (business_id, product_id) do update set on_hand = l.on_hand + excluded.on_hand
  returning l.on_hand into v_on_hand;

  if (v_on_hand - p_quantity > 0) <> (v_on_hand > 0) then
    perform private.queue_web_sync(p_product_id);
  end if;
  return v_on_hand;
end;
$$;

-- Valida la lista que manda la app ([{ productId, <cantidad> }]) y la devuelve ordenada por producto, con su nombre y si
-- está enlazado. De 1 a 50, sin repetir, cada uno activo y del negocio (si no, not_found). El orden fijo hace que dos
-- operaciones a la vez bloqueen las filas en el mismo orden
create function private.stock_items(p_business_id uuid, p_items jsonb, p_amount_key text, p_min integer, p_max integer)
returns table (product_id uuid, amount integer, name text, linked boolean)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_found integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    perform private.fail('invalid');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e (item)
    where jsonb_typeof(e.item) <> 'object'
      or e.item - 'productId' - p_amount_key <> '{}'::jsonb
      or jsonb_typeof(e.item -> 'productId') is distinct from 'string'
      or (e.item ->> 'productId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    perform private.fail('invalid');
  end if;
  perform private.json_integer(e.item -> p_amount_key, p_min, p_max) from jsonb_array_elements(p_items) as e (item);
  if (select count(distinct (e.item ->> 'productId')::uuid) from jsonb_array_elements(p_items) as e (item)) <> jsonb_array_length(p_items) then
    perform private.fail('invalid');
  end if;

  select count(*)::integer into v_found
  from jsonb_array_elements(p_items) as e (item)
  join public.products p on p.id = (e.item ->> 'productId')::uuid and p.business_id = p_business_id and p.is_active;
  if v_found <> jsonb_array_length(p_items) then
    perform private.fail('not_found');
  end if;

  return query
    select p.id, (e.item ->> p_amount_key)::integer, p.name, p.sanity_id is not null
    from jsonb_array_elements(p_items) as e (item)
    join public.products p on p.id = (e.item ->> 'productId')::uuid and p.business_id = p_business_id
    order by p.id;
end;
$$;

-- El stock de hoy: por alfajor activo, lo libre, lo apartado, lo que debería haber en la nevera y su estado
create function public.stock_overview() returns jsonb
language sql
stable
set search_path = ''
as $$
  with business as (
    select b.id from public.businesses b order by b.created_at, b.id limit 1
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
    'state', case
      when i.on_hand + i.reserved < 0 then 'check'
      when i.on_hand < 0 then 'owed'
      when i.on_hand = 0 then 'out'
      when i.on_hand <= i.min_stock then 'low'
      else 'ok'
    end
  ) order by i.sort_order, lower(i.name), i.id), '[]'::jsonb)
  from items i;
$$;

-- Suma la producción al stock. Devuelve el total, el stock nuevo de cada uno y los enlazados que vuelven a la web
create function private.register_production(p_request_id uuid, p_items jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_item record;
  v_on_hand integer;
  v_total integer := 0;
  v_items jsonb := '[]'::jsonb;
  v_back jsonb := '[]'::jsonb;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'register_production');
  if v_saved is not null then
    return v_saved;
  end if;

  for v_item in select * from private.stock_items(v_business_id, p_items, 'quantity', 1, 10000) loop
    v_on_hand := private.move_stock(v_business_id, v_item.product_id, 'production', v_item.amount, null, p_request_id, null);
    v_total := v_total + v_item.amount;
    v_items := v_items || jsonb_build_object('productId', v_item.product_id, 'onHand', v_on_hand);
    if v_item.linked and v_on_hand > 0 and v_on_hand - v_item.amount <= 0 then
      v_back := v_back || jsonb_build_object('productId', v_item.product_id, 'name', v_item.name);
    end if;
  end loop;

  return private.complete_request(v_business_id, p_request_id,
    jsonb_build_object('total', v_total, 'items', v_items, 'backOnWeb', v_back));
end;
$$;

-- Resta una merma, con su motivo. Avisa, no bloquea: el stock puede quedar negativo (D12)
create function private.register_waste(p_request_id uuid, p_product_id uuid, p_quantity integer, p_reason text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_linked boolean;
  v_on_hand integer;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'register_waste');
  if v_saved is not null then
    return v_saved;
  end if;

  if p_quantity is null or p_quantity not between 1 and 10000
     or p_reason is null or p_reason not in ('broken', 'expired', 'gift', 'other') then
    perform private.fail('invalid');
  end if;
  select p.sanity_id is not null into v_linked
  from public.products p where p.id = p_product_id and p.business_id = v_business_id and p.is_active;
  if not found then
    perform private.fail('not_found');
  end if;

  v_on_hand := private.move_stock(v_business_id, p_product_id, 'waste', -p_quantity, p_reason, p_request_id, null);
  return private.complete_request(v_business_id, p_request_id, jsonb_build_object(
    'productId', p_product_id,
    'onHand', v_on_hand,
    'outOnWeb', v_linked and v_on_hand <= 0 and v_on_hand + p_quantity > 0
  ));
end;
$$;

-- El conteo: el dueño cuenta todo lo que hay en la nevera, también lo apartado. Por alfajor, el ajuste es lo contado
-- menos lo que debería haber (libre + apartado), y solo se crea si hay diferencia: un conteo nunca borra lo comprometido
create function private.register_stock_count(p_request_id uuid, p_counts jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_item record;
  v_before integer;
  v_reserved integer;
  v_difference integer;
  v_on_hand integer;
  v_adjustments integer := 0;
  v_items jsonb := '[]'::jsonb;
  v_back jsonb := '[]'::jsonb;
  v_out jsonb := '[]'::jsonb;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'register_stock_count');
  if v_saved is not null then
    return v_saved;
  end if;

  for v_item in select * from private.stock_items(v_business_id, p_counts, 'counted', 0, 100000) loop
    insert into public.stock_levels (business_id, product_id) values (v_business_id, v_item.product_id)
    on conflict (business_id, product_id) do nothing;
    select l.on_hand into v_before
    from public.stock_levels l where l.business_id = v_business_id and l.product_id = v_item.product_id
    for update;
    select coalesce(sum(r.reserved), 0)::integer into v_reserved
    from private.reserved_stock(v_business_id) as r where r.product_id = v_item.product_id;

    v_difference := v_item.amount - (v_before + v_reserved);
    v_on_hand := v_before;
    if v_difference <> 0 then
      v_on_hand := private.move_stock(v_business_id, v_item.product_id, 'adjustment', v_difference, 'count', p_request_id, null);
      v_adjustments := v_adjustments + 1;
      if v_item.linked and v_before <= 0 and v_on_hand > 0 then
        v_back := v_back || jsonb_build_object('productId', v_item.product_id, 'name', v_item.name);
      elsif v_item.linked and v_before > 0 and v_on_hand <= 0 then
        v_out := v_out || jsonb_build_object('productId', v_item.product_id, 'name', v_item.name);
      end if;
    end if;
    v_items := v_items || jsonb_build_object('productId', v_item.product_id, 'onHand', v_on_hand);
  end loop;

  return private.complete_request(v_business_id, p_request_id, jsonb_build_object(
    'adjustments', v_adjustments, 'items', v_items, 'backOnWeb', v_back, 'outOnWeb', v_out
  ));
end;
$$;

-- El «Deshacer» de una producción, una merma o un conteo, entero: por cada movimiento de ese registro que no se deshizo,
-- uno contrario que apunta a él. Solo dentro de los 10 minutos; la segunda vez no deshace nada más
create function private.revert_stock_change(p_request_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_movement record;
  v_on_hand integer;
  v_reverted integer := 0;
  v_items jsonb := '[]'::jsonb;
begin
  if p_request_id is null then
    perform private.fail('invalid');
  end if;
  -- Bloquea los movimientos del registro: dos «Deshacer» a la vez van en fila, y el segundo ve lo que hizo el primero
  perform 1 from public.stock_movements m
  where m.business_id = v_business_id and m.request_id = p_request_id
  for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if exists (
    select 1 from public.stock_movements m
    where m.business_id = v_business_id and m.request_id = p_request_id and m.created_at < now() - interval '10 minutes'
  ) then
    perform private.fail('invalid');
  end if;

  for v_movement in
    select m.id, m.product_id, m.quantity
    from public.stock_movements m
    where m.business_id = v_business_id and m.request_id = p_request_id
      and not exists (
        select 1 from public.stock_movements u where u.business_id = v_business_id and u.reverts_movement_id = m.id
      )
    order by m.product_id
  loop
    v_on_hand := private.move_stock(v_business_id, v_movement.product_id, 'adjustment', -v_movement.quantity, 'undo', null, v_movement.id);
    v_reverted := v_reverted + 1;
    v_items := v_items || jsonb_build_object('productId', v_movement.product_id, 'onHand', v_on_hand);
  end loop;

  return jsonb_build_object('reverted', v_reverted, 'items', v_items);
end;
$$;

-- El historial de un alfajor, del más nuevo al más viejo, por páginas con cursor (docs/spec/README.md, «Listas largas»).
-- El cursor es opaco para la app: la fecha (en UTC, con microsegundos) y el id del último de la página, en base64
create function public.list_product_movements(p_product_id uuid, p_limit integer default 20, p_cursor text default null) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_limit integer := coalesce(p_limit, 20);
  v_after_at timestamptz;
  v_after_id uuid;
  v_total integer;
  v_page jsonb;
  v_rows integer;
  v_last jsonb;
begin
  if v_limit < 1 then
    perform private.fail('invalid');
  end if;
  v_limit := least(v_limit, 50);
  if p_cursor is not null then
    begin
      select split_part(t.value, '|', 1)::timestamptz, split_part(t.value, '|', 2)::uuid
      into v_after_at, v_after_id
      from convert_from(decode(p_cursor, 'base64'), 'UTF8') as t (value);
    exception when others then
      perform private.fail('invalid');
    end;
  end if;

  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select count(*)::integer into v_total
  from public.stock_movements m where m.business_id = v_business_id and m.product_id = p_product_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', page.id, 'kind', page.kind, 'quantity', page.quantity, 'reason', page.reason, 'happenedAt', page.happened_at
    ) order by page.happened_at desc, page.id desc), '[]'::jsonb), count(*)::integer
  into v_page, v_rows
  from (
    select m.id, m.kind, m.quantity, m.reason, m.happened_at
    from public.stock_movements m
    where m.business_id = v_business_id and m.product_id = p_product_id
      and (v_after_at is null or (m.happened_at, m.id) < (v_after_at, v_after_id))
    order by m.happened_at desc, m.id desc
    limit v_limit + 1
  ) as page;

  -- Se pidió uno de más: si llegó, hay otra página
  if v_rows > v_limit then
    v_page := v_page - v_limit;
    v_last := v_page -> (v_limit - 1);
  end if;

  return jsonb_build_object(
    'items', v_page,
    'meta', jsonb_build_object(
      'limit', v_limit,
      'total', v_total,
      'hasMore', v_rows > v_limit,
      'nextCursor', case when v_rows > v_limit then replace(encode(convert_to(
        to_char((v_last ->> 'happenedAt')::timestamptz at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || (v_last ->> 'id'),
        'UTF8'), 'base64'), E'\n', '') end
    )
  );
end;
$$;

create function public.register_production(p_request_id uuid, p_items jsonb) returns jsonb
language sql
set search_path = ''
as $$
  select private.register_production(p_request_id, p_items);
$$;

create function public.register_waste(p_request_id uuid, p_product_id uuid, p_quantity integer, p_reason text) returns jsonb
language sql
set search_path = ''
as $$
  select private.register_waste(p_request_id, p_product_id, p_quantity, p_reason);
$$;

create function public.register_stock_count(p_request_id uuid, p_counts jsonb) returns jsonb
language sql
set search_path = ''
as $$
  select private.register_stock_count(p_request_id, p_counts);
$$;

create function public.revert_stock_change(p_request_id uuid) returns jsonb
language sql
set search_path = ''
as $$
  select private.revert_stock_change(p_request_id);
$$;

-- La app ejecuta las seis públicas. Como corren con su rol, también necesita las privadas que llaman:
-- las cuatro que escriben y la de lo apartado (stock_overview la lee con las reglas de acceso)
grant execute on function public.stock_overview() to authenticated;
grant execute on function public.register_production(uuid, jsonb) to authenticated;
grant execute on function public.register_waste(uuid, uuid, integer, text) to authenticated;
grant execute on function public.register_stock_count(uuid, jsonb) to authenticated;
grant execute on function public.revert_stock_change(uuid) to authenticated;
grant execute on function public.list_product_movements(uuid, integer, text) to authenticated;
grant execute on function private.register_production(uuid, jsonb) to authenticated;
grant execute on function private.register_waste(uuid, uuid, integer, text) to authenticated;
grant execute on function private.register_stock_count(uuid, jsonb) to authenticated;
grant execute on function private.revert_stock_change(uuid) to authenticated;
grant execute on function private.reserved_stock(uuid) to authenticated;
