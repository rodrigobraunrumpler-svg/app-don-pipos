-- Crear pedidos y ventas de mostrador (docs/spec/orders.md §3): número correlativo, precios congelados, cliente por
-- teléfono, venta en el stock y el pago, todo en una sola operación.

-- Una fecha como texto ISO con milisegundos y «Z»: el formato que cualquier celular lee (fase 3)
create function private.iso_time(p_at timestamptz) returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- El plural de la maqueta: un nombre de una palabra suma «s»; uno de dos o más queda igual
create function private.plural_name(p_name text) returns text
language sql
immutable
set search_path = ''
as $$
  select case when position(' ' in p_name) > 0 then p_name else p_name || 's' end;
$$;

-- El movimiento de stock con su pedido (venta o anulación). La de siete argumentos sigue, sin pedido
create function private.move_stock(
  p_business_id uuid, p_product_id uuid, p_kind text, p_quantity integer, p_reason text, p_request_id uuid, p_reverts uuid,
  p_order_id uuid
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_on_hand integer;
begin
  insert into public.stock_movements (business_id, product_id, kind, quantity, reason, request_id, reverts_movement_id, order_id)
  values (p_business_id, p_product_id, p_kind, p_quantity, p_reason, p_request_id, p_reverts, p_order_id);

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

create or replace function private.move_stock(
  p_business_id uuid, p_product_id uuid, p_kind text, p_quantity integer, p_reason text, p_request_id uuid, p_reverts uuid
) returns integer
language sql
set search_path = ''
as $$
  select private.move_stock(p_business_id, p_product_id, p_kind, p_quantity, p_reason, p_request_id, p_reverts, null);
$$;

-- Un pedido como lo ve la app: sus datos, sus líneas, sus pagos, su línea de tiempo (sin lo deshecho) y su cliente
create function private.order_json(p_order_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'number', o.number,
    'status', o.status,
    'fulfillment', o.fulfillment,
    'channel', o.channel,
    'customerId', o.customer_id,
    'customerName', o.customer_name,
    'promisedAt', private.iso_time(o.promised_at),
    'scheduledFor', o.scheduled_for,
    'dueDate', o.due_date,
    'deliveryAddress', o.delivery_address,
    'deliveryFeeCents', o.delivery_fee_cents::integer,
    'discountCents', o.discount_cents::integer,
    'discountReason', o.discount_reason,
    'subtotalCents', o.subtotal_cents::integer,
    'totalCents', o.total_cents::integer,
    'paidCents', o.paid_cents::integer,
    'deliveredAt', private.iso_time(o.delivered_at),
    'note', o.note,
    'itemsSummary', o.items_summary,
    'itemsCount', o.items_count,
    'version', o.version,
    'createdAt', private.iso_time(o.created_at),
    'lines', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'productId', l.product_id, 'productName', l.product_name, 'quantity', l.quantity, 'unitPriceCents', l.unit_price_cents::integer
      ) order by lower(l.product_name), l.product_id), '[]'::jsonb)
      from public.order_lines l where l.business_id = o.business_id and l.order_id = o.id
    ),
    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'kind', p.kind, 'method', p.method, 'amountCents', p.amount_cents::integer,
        'paidAt', private.iso_time(p.paid_at), 'voidedAt', private.iso_time(p.voided_at)
      ) order by p.paid_at, p.id), '[]'::jsonb)
      from public.payments p where p.business_id = o.business_id and p.order_id = o.id
    ),
    'timeline', (
      select coalesce(jsonb_agg(jsonb_build_object('status', e.status, 'at', private.iso_time(e.at)) order by e.at, e.id), '[]'::jsonb)
      from public.order_status_events e where e.business_id = o.business_id and e.order_id = o.id and e.reverted_at is null
    ),
    'customer', (
      select jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'address', c.address)
      from public.customers c where c.business_id = o.business_id and c.id = o.customer_id
    )
  )
  from public.orders o
  where o.id = p_order_id;
$$;

-- El número siguiente del negocio. La fila del contador queda bloqueada hasta el final de la operación: dos pedidos a
-- la vez van en fila, y si uno falla, su número vuelve (no quedan huecos)
create function private.next_order_number(p_business_id uuid) returns integer
language sql
set search_path = ''
as $$
  update private.business_counters k
  set next_order_number = k.next_order_number + 1
  where k.business_id = p_business_id
  returning k.next_order_number - 1;
$$;

-- Un monto opcional del JSON: vacío o ausente es 0
create function private.json_cents_or_zero(p_value jsonb) returns integer
language sql
stable
set search_path = ''
as $$
  select case when p_value is null or jsonb_typeof(p_value) = 'null' then 0 else private.json_integer(p_value, 0, 1000000) end;
$$;

create function private.create_order(p_request_id uuid, p_draft jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_settings public.business_settings%rowtype;
  v_today date := (now() at time zone 'America/Lima')::date;
  v_fulfillment text;
  v_channel text;
  v_phone text;
  v_name text;
  v_address text;
  v_scheduled date;
  v_promised timestamptz;
  v_discount integer;
  v_reason text;
  v_note text;
  v_payment_method text;
  v_payment_amount integer;
  v_customer public.customers%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_number integer;
  v_subtotal integer;
  v_count integer;
  v_summary text;
  v_fee integer;
  v_total integer;
  v_line record;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'create_order', md5(coalesce(p_draft::text, '')));
  if v_saved is not null then
    return v_saved;
  end if;

  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    perform private.fail('invalid');
  end if;
  select s.* into v_settings from public.business_settings s where s.business_id = v_business_id;

  -- Entrega y canal: el mostrador va por create_counter_sale
  v_fulfillment := p_draft ->> 'fulfillment';
  v_channel := coalesce(p_draft ->> 'channel', 'whatsapp');
  if v_fulfillment is null or v_fulfillment not in ('delivery', 'pickup') or v_channel not in ('whatsapp', 'local', 'web') then
    perform private.fail('invalid');
  end if;

  -- El cliente, por su teléfono (D14); si es nuevo, con su nombre
  if jsonb_typeof(p_draft -> 'customer') is distinct from 'object' then
    perform private.fail('invalid');
  end if;
  v_phone := p_draft -> 'customer' ->> 'phone';
  v_name := nullif(btrim(p_draft -> 'customer' ->> 'name'), '');
  if v_phone is null or v_phone !~ '^\+51[0-9]{9}$' or length(v_name) > 60 then
    perform private.fail('invalid');
  end if;

  -- La dirección (solo en delivery), el día, la hora acordada, el descuento y la nota
  v_address := nullif(btrim(p_draft ->> 'deliveryAddress'), '');
  if v_fulfillment = 'delivery' and (v_address is null or length(v_address) > 200) then
    perform private.fail('invalid');
  end if;
  if v_fulfillment = 'pickup' then
    v_address := null;
  end if;
  begin
    v_scheduled := (p_draft ->> 'scheduledFor')::date;
    v_promised := (p_draft ->> 'promisedAt')::timestamptz;
  exception when others then
    perform private.fail('invalid');
  end;
  if v_scheduled < v_today then
    perform private.fail('invalid');
  end if;
  if v_scheduled = v_today then
    v_scheduled := null;
  end if;
  v_discount := private.json_cents_or_zero(p_draft -> 'discountCents');
  v_reason := nullif(btrim(p_draft ->> 'discountReason'), '');
  if (v_discount > 0 and v_reason is null) or length(v_reason) > 60 then
    perform private.fail('invalid');
  end if;
  if v_discount = 0 then
    v_reason := null;
  end if;
  v_note := nullif(btrim(p_draft ->> 'note'), '');
  if length(v_note) > 300 then
    perform private.fail('invalid');
  end if;

  -- Las líneas (activas y del negocio, sin repetir) con el precio de hoy, y el resumen («2 Coquetas, 1 Pipo Crush»)
  select coalesce(sum(i.amount * p.price_cents), 0)::integer, coalesce(sum(i.amount), 0)::integer,
         string_agg(i.amount || ' ' || case when i.amount = 1 then i.name else private.plural_name(i.name) end, ', ' order by lower(i.name))
  into v_subtotal, v_count, v_summary
  from private.stock_items(v_business_id, p_draft -> 'lines', 'quantity', 1, 10000) i
  join public.products p on p.id = i.product_id;

  v_fee := case when v_fulfillment = 'delivery' then v_settings.delivery_fee_cents else 0 end;
  if v_discount > v_subtotal + v_fee then
    perform private.fail('invalid');
  end if;
  v_total := v_subtotal + v_fee - v_discount;

  -- El pago al anotar: uno solo, hasta el total, con un medio activo
  if jsonb_typeof(p_draft -> 'payment') = 'object' then
    v_payment_method := p_draft -> 'payment' ->> 'method';
    v_payment_amount := private.json_integer(p_draft -> 'payment' -> 'amountCents', 1, 1000000);
    if v_payment_method is null or not (v_payment_method = any (v_settings.active_payment_methods::text[])) or v_payment_amount > v_total then
      perform private.fail('invalid');
    end if;
  elsif coalesce(jsonb_typeof(p_draft -> 'payment'), 'null') <> 'null' then
    perform private.fail('invalid');
  end if;

  -- El cliente: se crea o se actualiza por su teléfono, con sus totales
  select c.* into v_customer from public.customers c where c.business_id = v_business_id and c.phone = v_phone for update;
  if not found then
    if v_name is null then
      perform private.fail('invalid');
    end if;
    insert into public.customers (business_id, name, phone, address)
    values (v_business_id, v_name, v_phone, v_address)
    returning * into v_customer;
  end if;
  update public.customers c
  set name = coalesce(v_name, c.name),
      address = coalesce(v_address, c.address),
      orders_count = c.orders_count + 1,
      spent_cents = c.spent_cents + v_total,
      last_order_at = now(),
      version = c.version + 1
  where c.id = v_customer.id
  returning * into v_customer;

  v_number := private.next_order_number(v_business_id);
  insert into public.orders (
    id, business_id, number, customer_id, channel, fulfillment, status, promised_at, scheduled_for, due_date,
    delivery_address, delivery_fee_cents, discount_cents, discount_reason, subtotal_cents, total_cents, paid_cents, note,
    customer_name, items_summary, items_count
  ) values (
    v_order_id, v_business_id, v_number, v_customer.id, v_channel, v_fulfillment, 'new', v_promised, v_scheduled,
    coalesce(v_scheduled, v_today), v_address, v_fee, v_discount, v_reason, v_subtotal, v_total,
    coalesce(v_payment_amount, 0), v_note, v_customer.name, v_summary, v_count
  );

  -- El precio, el costo y el nombre de hoy quedan en cada línea (D9); el stock baja con una venta por línea (D12)
  for v_line in
    select i.product_id, i.amount, p.name, p.price_cents, p.cost_cents
    from private.stock_items(v_business_id, p_draft -> 'lines', 'quantity', 1, 10000) i
    join public.products p on p.id = i.product_id
  loop
    insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents, unit_cost_cents)
    values (v_business_id, v_order_id, v_line.product_id, v_line.name, v_line.amount, v_line.price_cents, v_line.cost_cents);
    perform private.move_stock(v_business_id, v_line.product_id, 'sale', -v_line.amount, null, null, null, v_order_id);
  end loop;

  insert into public.order_status_events (business_id, order_id, status) values (v_business_id, v_order_id, 'new');
  if v_payment_amount is not null then
    insert into public.payments (business_id, order_id, kind, method, amount_cents)
    values (v_business_id, v_order_id, 'payment', v_payment_method::public.payment_method, v_payment_amount);
  end if;

  return private.complete_request(v_business_id, p_request_id, private.order_json(v_order_id));
end;
$$;

-- La venta de mostrador: sin cliente, entregada al momento y pagada por el total con el medio elegido
create function private.create_counter_sale(p_request_id uuid, p_items jsonb, p_method text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_settings public.business_settings%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_number integer;
  v_total integer;
  v_count integer;
  v_summary text;
  v_line record;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'create_counter_sale',
    md5(coalesce(p_items::text, '') || '|' || coalesce(p_method, '')));
  if v_saved is not null then
    return v_saved;
  end if;

  select s.* into v_settings from public.business_settings s where s.business_id = v_business_id;
  if p_method is null or not (p_method = any (v_settings.active_payment_methods::text[])) then
    perform private.fail('invalid');
  end if;

  select coalesce(sum(i.amount * p.price_cents), 0)::integer, coalesce(sum(i.amount), 0)::integer,
         string_agg(i.amount || ' ' || case when i.amount = 1 then i.name else private.plural_name(i.name) end, ', ' order by lower(i.name))
  into v_total, v_count, v_summary
  from private.stock_items(v_business_id, p_items, 'quantity', 1, 10000) i
  join public.products p on p.id = i.product_id;

  v_number := private.next_order_number(v_business_id);
  insert into public.orders (
    id, business_id, number, customer_id, channel, fulfillment, status, due_date, delivered_at,
    delivery_fee_cents, discount_cents, subtotal_cents, total_cents, paid_cents, items_summary, items_count
  ) values (
    v_order_id, v_business_id, v_number, null, 'local', 'counter', 'delivered', (now() at time zone 'America/Lima')::date, now(),
    0, 0, v_total, v_total, v_total, v_summary, v_count
  );

  for v_line in
    select i.product_id, i.amount, p.name, p.price_cents, p.cost_cents
    from private.stock_items(v_business_id, p_items, 'quantity', 1, 10000) i
    join public.products p on p.id = i.product_id
  loop
    insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents, unit_cost_cents)
    values (v_business_id, v_order_id, v_line.product_id, v_line.name, v_line.amount, v_line.price_cents, v_line.cost_cents);
    perform private.move_stock(v_business_id, v_line.product_id, 'sale', -v_line.amount, null, null, null, v_order_id);
  end loop;

  insert into public.order_status_events (business_id, order_id, status) values (v_business_id, v_order_id, 'delivered');
  insert into public.payments (business_id, order_id, kind, method, amount_cents)
  values (v_business_id, v_order_id, 'payment', p_method::public.payment_method, v_total);

  return private.complete_request(v_business_id, p_request_id, private.order_json(v_order_id));
end;
$$;

create function public.create_order(p_request_id uuid, p_draft jsonb) returns jsonb
language sql
set search_path = ''
as $$
  select private.create_order(p_request_id, p_draft);
$$;

create function public.create_counter_sale(p_request_id uuid, p_items jsonb, p_method text) returns jsonb
language sql
set search_path = ''
as $$
  select private.create_counter_sale(p_request_id, p_items, p_method);
$$;

grant execute on function public.create_order(uuid, jsonb) to authenticated;
grant execute on function public.create_counter_sale(uuid, jsonb, text) to authenticated;
grant execute on function private.create_order(uuid, jsonb) to authenticated;
grant execute on function private.create_counter_sale(uuid, jsonb, text) to authenticated;
