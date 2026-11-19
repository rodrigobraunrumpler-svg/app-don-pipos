-- Arreglos de la revisión final de la fase 3 (docs/plan/fase-3-productos-stock.md, «Después de la revisión final»)

-- 1. Un reintento con el mismo código pero con otros datos ya no devuelve lo de antes como si fuera lo nuevo: es un
--    conflicto. La clave guarda una huella de los datos (md5 de los argumentos)
alter table private.idempotency_keys add column fingerprint text;

create function private.claim_request(p_business_id uuid, p_request_id uuid, p_function text, p_fingerprint text) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_key private.idempotency_keys%rowtype;
begin
  if p_request_id is null then
    perform private.fail('invalid');
  end if;

  insert into private.idempotency_keys (business_id, request_id, function_name, fingerprint)
  values (p_business_id, p_request_id, p_function, p_fingerprint)
  on conflict (business_id, request_id) do nothing;
  if found then
    return null;
  end if;

  select k.* into v_key
  from private.idempotency_keys k
  where k.business_id = p_business_id and k.request_id = p_request_id;

  -- Otra función, una clave sin respuesta guardada, u otros datos con el mismo código: no se crea nada más
  if v_key.function_name <> p_function or v_key.response is null or v_key.fingerprint is distinct from p_fingerprint then
    perform private.fail('conflict');
  end if;
  return v_key.response;
end;
$$;

-- La de tres argumentos queda, sin huella, para quien no la mande
create or replace function private.claim_request(p_business_id uuid, p_request_id uuid, p_function text) returns jsonb
language sql
set search_path = ''
as $$
  select private.claim_request(p_business_id, p_request_id, p_function, null);
$$;

-- Las tres funciones que registran, ahora con la huella de sus datos

create or replace function private.register_production(p_request_id uuid, p_items jsonb) returns jsonb
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
  v_saved := private.claim_request(v_business_id, p_request_id, 'register_production', md5(coalesce(p_items::text, '')));
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

create or replace function private.register_waste(p_request_id uuid, p_product_id uuid, p_quantity integer, p_reason text) returns jsonb
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
  v_saved := private.claim_request(v_business_id, p_request_id, 'register_waste', md5(concat_ws('|', p_product_id, p_quantity, p_reason)));
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

create or replace function private.register_stock_count(p_request_id uuid, p_counts jsonb) returns jsonb
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
  v_saved := private.claim_request(v_business_id, p_request_id, 'register_stock_count', md5(coalesce(p_counts::text, '')));
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

-- 2. El historial, con fechas que cualquier celular lee
-- El historial de un alfajor, del más nuevo al más viejo, por páginas con cursor (docs/spec/README.md, «Listas largas»).
-- La fecha sale con milisegundos y en UTC («Z»), un formato que cualquier celular lee. El cursor usa la fecha exacta
-- (microsegundos) y el id del último de la página, en base64: así no repite ni salta filas
create or replace function public.list_product_movements(p_product_id uuid, p_limit integer default 20, p_cursor text default null) returns jsonb
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
  v_items jsonb := '[]'::jsonb;
  v_rows integer := 0;
  v_row record;
  v_last_at timestamptz;
  v_last_id uuid;
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

  -- Se pide uno de más: si llega, hay otra página
  for v_row in
    select m.id, m.kind, m.quantity, m.reason, m.happened_at
    from public.stock_movements m
    where m.business_id = v_business_id and m.product_id = p_product_id
      and (v_after_at is null or (m.happened_at, m.id) < (v_after_at, v_after_id))
    order by m.happened_at desc, m.id desc
    limit v_limit + 1
  loop
    v_rows := v_rows + 1;
    exit when v_rows > v_limit;
    v_items := v_items || jsonb_build_object(
      'id', v_row.id,
      'kind', v_row.kind,
      'quantity', v_row.quantity,
      'reason', v_row.reason,
      'happenedAt', to_char(v_row.happened_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
    v_last_at := v_row.happened_at;
    v_last_id := v_row.id;
  end loop;

  return jsonb_build_object(
    'items', v_items,
    'meta', jsonb_build_object(
      'limit', v_limit,
      'total', v_total,
      'hasMore', v_rows > v_limit,
      'nextCursor', case when v_rows > v_limit then replace(encode(convert_to(
        to_char(v_last_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || v_last_id,
        'UTF8'), 'base64'), E'\n', '') end
    )
  );
end;
$$;
