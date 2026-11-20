-- Editar un pedido antes de entregarlo y su «Deshacer» (docs/spec/orders.md §3). Las líneas que ya estaban conservan
-- su nombre, precio y costo; las nuevas van al precio de hoy. El stock se mueve con la diferencia y, si el total baja
-- de lo pagado, se devuelve la diferencia en la misma operación. Lo de antes queda en private.audit_log para deshacer.

-- Rehace el resumen, la cantidad, el subtotal y el total del pedido desde sus líneas (el resumen como create_order)
create function private.refresh_order_totals(p_order_id uuid) returns void
language sql
set search_path = ''
as $$
  update public.orders o
  set items_summary = s.summary,
      items_count = s.units,
      subtotal_cents = s.subtotal,
      total_cents = s.subtotal + o.delivery_fee_cents - o.discount_cents
  from (
    select sum(l.quantity)::integer as units,
           sum(l.quantity * l.unit_price_cents)::integer as subtotal,
           string_agg(
             l.quantity || ' ' || case when l.quantity = 1 then l.product_name else private.plural_name(l.product_name) end,
             ', ' order by lower(l.product_name)
           ) as summary
    from public.order_lines l
    where l.order_id = p_order_id
  ) s
  where o.id = p_order_id;
$$;

-- Deja el pedido con estas líneas (nombre, precio y costo ya decididos) y mueve el stock con la diferencia: más alfajores
-- es una venta; menos, una anulación. En orden de producto: dos operaciones bloquean el stock siempre en el mismo orden
create function private.set_order_lines(p_business_id uuid, p_order_id uuid, p_lines jsonb) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_change record;
begin
  for v_change in
    select coalesce(n.product_id, o.product_id) as product_id, coalesce(n.quantity, 0) - coalesce(o.quantity, 0) as diff
    from (select l.product_id, l.quantity from public.order_lines l where l.order_id = p_order_id) o
    full join (
      select (e ->> 'productId')::uuid as product_id, (e ->> 'quantity')::integer as quantity
      from jsonb_array_elements(p_lines) as e
    ) n on n.product_id = o.product_id
    order by 1
  loop
    if v_change.diff > 0 then
      perform private.move_stock(p_business_id, v_change.product_id, 'sale', -v_change.diff, null, null, null, p_order_id);
    elsif v_change.diff < 0 then
      perform private.move_stock(
        p_business_id, v_change.product_id, 'cancellation', -v_change.diff, null, null, null, p_order_id
      );
    end if;
  end loop;

  delete from public.order_lines l
  where l.order_id = p_order_id
    and l.product_id not in (select (e ->> 'productId')::uuid from jsonb_array_elements(p_lines) as e);
  insert into public.order_lines (business_id, order_id, product_id, product_name, quantity, unit_price_cents, unit_cost_cents)
  select p_business_id, p_order_id, (e ->> 'productId')::uuid, e ->> 'productName', (e ->> 'quantity')::integer,
         (e ->> 'unitPriceCents')::integer, (e ->> 'unitCostCents')::integer
  from jsonb_array_elements(p_lines) as e
  on conflict (business_id, order_id, product_id) do update
  set quantity = excluded.quantity,
      product_name = excluded.product_name,
      unit_price_cents = excluded.unit_price_cents,
      unit_cost_cents = excluded.unit_cost_cents;
end;
$$;

-- Editar: solo sin entregar ni anular y no de mostrador; con otra versión, conflicto. Total nuevo por debajo de lo
-- pagado: se devuelve exactamente la diferencia (no hay saldo a favor); si no baja, no se devuelve nada
create function private.edit_order(
  p_request_id uuid, p_order_id uuid, p_expected_version integer, p_lines jsonb, p_refund_cents integer, p_refund_method text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_order public.orders%rowtype;
  v_old_lines jsonb;
  v_lines jsonb;
  v_missing integer;
  v_total integer;
  v_refund_id uuid;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'edit_order',
    md5(concat_ws('|', p_order_id, p_expected_version, p_lines::text, p_refund_cents, p_refund_method)));
  if v_saved is not null then
    return v_saved;
  end if;

  select o.* into v_order from public.orders o where o.business_id = v_business_id and o.id = p_order_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_order.status in ('delivered', 'cancelled') or v_order.fulfillment = 'counter' then
    perform private.fail('invalid');
  end if;
  if v_order.version is distinct from p_expected_version then
    perform private.fail('conflict');
  end if;

  -- Las líneas: de 1 a 50 objetos { productId, quantity }, sin repetir alfajor, con cantidad de 1 a 10,000
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 50 or exists (
    select 1 from jsonb_array_elements(p_lines) as e
    where jsonb_typeof(e) <> 'object' or e - 'productId' - 'quantity' <> '{}'::jsonb
      or (e ->> 'productId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    perform private.fail('invalid');
  end if;
  if (select count(distinct (e ->> 'productId')::uuid) from jsonb_array_elements(p_lines) as e) <> jsonb_array_length(p_lines) then
    perform private.fail('invalid');
  end if;
  perform private.json_integer(e -> 'quantity', 1, 10000) from jsonb_array_elements(p_lines) as e;

  -- La que ya estaba conserva lo suyo (aunque el alfajor se haya apagado); la nueva, un alfajor activo, al precio de hoy
  select jsonb_agg(jsonb_build_object(
           'productId', n.product_id,
           'quantity', n.quantity,
           'productName', coalesce(l.product_name, p.name),
           'unitPriceCents', coalesce(l.unit_price_cents, p.price_cents),
           'unitCostCents', case when l.id is not null then l.unit_cost_cents else p.cost_cents end
         ) order by n.product_id),
         count(*) filter (where l.id is null and p.id is null)
  into v_lines, v_missing
  from (
    select (e ->> 'productId')::uuid as product_id, (e ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_lines) as e
  ) n
  left join public.order_lines l on l.business_id = v_business_id and l.order_id = p_order_id and l.product_id = n.product_id
  left join public.products p on l.id is null and p.business_id = v_business_id and p.id = n.product_id and p.is_active;
  if v_missing > 0 then
    perform private.fail('not_found');
  end if;

  select sum((e ->> 'quantity')::integer * (e ->> 'unitPriceCents')::integer)::integer
           + v_order.delivery_fee_cents - v_order.discount_cents
  into v_total
  from jsonb_array_elements(v_lines) as e;
  if v_total < 0 then
    perform private.fail('invalid');
  end if;
  if v_total < v_order.paid_cents then
    if p_refund_cents is distinct from v_order.paid_cents - v_total or p_refund_method is null or not exists (
      select 1 from public.business_settings s
      where s.business_id = v_business_id and p_refund_method = any (s.active_payment_methods::text[])
    ) then
      perform private.fail('invalid');
    end if;
  elsif coalesce(p_refund_cents, 0) <> 0 then
    perform private.fail('invalid');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'productId', l.product_id, 'productName', l.product_name, 'quantity', l.quantity,
           'unitPriceCents', l.unit_price_cents, 'unitCostCents', l.unit_cost_cents
         ) order by l.product_id), '[]'::jsonb)
  into v_old_lines
  from public.order_lines l
  where l.business_id = v_business_id and l.order_id = p_order_id;

  perform private.set_order_lines(v_business_id, p_order_id, v_lines);
  -- La devolución baja lo pagado antes de bajar el total: lo pagado nunca pasa del total
  if v_total < v_order.paid_cents then
    insert into public.payments (business_id, order_id, kind, method, amount_cents)
    values (v_business_id, p_order_id, 'refund', p_refund_method::public.payment_method, p_refund_cents)
    returning id into v_refund_id;
    update public.orders o set paid_cents = o.paid_cents - p_refund_cents where o.id = p_order_id;
  end if;
  perform private.refresh_order_totals(p_order_id);
  update public.orders o set version = o.version + 1 where o.id = p_order_id;

  if v_order.customer_id is not null then
    update public.customers c
    set spent_cents = c.spent_cents + (v_total - v_order.total_cents), version = c.version + 1
    where c.business_id = v_business_id and c.id = v_order.customer_id;
  end if;

  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'orders', p_order_id, 'update',
    jsonb_build_object('kind', 'edit', 'lines', v_old_lines, 'refundId', v_refund_id),
    jsonb_build_object('version', v_order.version + 1), (select auth.uid()));

  return private.complete_request(v_business_id, p_request_id, private.order_json(p_order_id));
end;
$$;

-- El «Deshacer» de una edición: solo si es el último cambio del pedido (su versión no cambió) y de hace menos de 10
-- minutos. Vuelve a las líneas guardadas, devuelve la diferencia de stock y anula la devolución de esa edición
create function private.revert_edit(p_order_id uuid, p_version integer) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_order public.orders%rowtype;
  v_last private.audit_log%rowtype;
  v_refund public.payments%rowtype;
  v_total integer;
begin
  select o.* into v_order from public.orders o where o.business_id = v_business_id and o.id = p_order_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_order.version is distinct from p_version then
    perform private.fail('conflict');
  end if;
  select a.* into v_last
  from private.audit_log a
  where a.business_id = v_business_id and a.table_name = 'orders' and a.row_id = p_order_id
  order by a.changed_at desc, a.id desc
  limit 1;
  if v_last.id is null or v_last.old_data ->> 'kind' is distinct from 'edit'
    or (v_last.new_data ->> 'version')::integer is distinct from p_version
    or v_last.changed_at < now() - interval '10 minutes' or v_order.status in ('delivered', 'cancelled') then
    perform private.fail('invalid');
  end if;

  perform private.set_order_lines(v_business_id, p_order_id, v_last.old_data -> 'lines');
  perform private.refresh_order_totals(p_order_id);
  if v_last.old_data ->> 'refundId' is not null then
    update public.payments p
    set voided_at = now(), void_reason = 'Deshacer edición'
    where p.business_id = v_business_id and p.id = (v_last.old_data ->> 'refundId')::uuid and p.voided_at is null
    returning p.* into v_refund;
    if v_refund.id is not null then
      update public.orders o set paid_cents = o.paid_cents + v_refund.amount_cents where o.id = p_order_id;
    end if;
  end if;
  update public.orders o set version = o.version + 1 where o.id = p_order_id returning o.total_cents into v_total;

  if v_order.customer_id is not null then
    update public.customers c
    set spent_cents = c.spent_cents + (v_total - v_order.total_cents), version = c.version + 1
    where c.business_id = v_business_id and c.id = v_order.customer_id;
  end if;

  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'orders', p_order_id, 'update', jsonb_build_object('kind', 'revert_edit'),
    jsonb_build_object('version', v_order.version + 1), (select auth.uid()));

  return private.order_json(p_order_id);
end;
$$;

create function public.edit_order(
  p_request_id uuid, p_order_id uuid, p_expected_version integer, p_lines jsonb, p_refund_cents integer, p_refund_method text
) returns jsonb
language sql
set search_path = ''
as $$
  select private.edit_order(p_request_id, p_order_id, p_expected_version, p_lines, p_refund_cents, p_refund_method);
$$;

create function public.revert_edit(p_order_id uuid, p_version integer) returns jsonb
language sql
set search_path = ''
as $$
  select private.revert_edit(p_order_id, p_version);
$$;

grant execute on function public.edit_order(uuid, uuid, integer, jsonb, integer, text) to authenticated;
grant execute on function public.revert_edit(uuid, integer) to authenticated;
grant execute on function private.edit_order(uuid, uuid, integer, jsonb, integer, text) to authenticated;
grant execute on function private.revert_edit(uuid, integer) to authenticated;
