-- Anular un pedido y su «Deshacer» (docs/spec/orders.md §3). Se anula en cualquier estado, también entregado o una
-- venta de mostrador: el stock vuelve, la devolución (total o parcial) es otra fila con la fecha de hoy y los pagos
-- originales quedan. Los sellos llegan con la fidelidad (fase 7). Lo de antes queda en private.audit_log.

-- El pedido como lo ve la app, ahora con el motivo de la anulación
create or replace function private.order_json(p_order_id uuid) returns jsonb
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
    'cancelReason', o.cancel_reason,
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

-- Mueve el stock de todas las líneas del pedido: vuelven (anular) o se vuelven a restar (deshacer la anulación).
-- En orden de producto, como el resto
create function private.move_order_stock(p_business_id uuid, p_order_id uuid, p_back boolean) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_line record;
begin
  for v_line in
    select l.product_id, l.quantity from public.order_lines l where l.business_id = p_business_id and l.order_id = p_order_id
    order by l.product_id
  loop
    if p_back then
      perform private.move_stock(p_business_id, v_line.product_id, 'cancellation', v_line.quantity, null, null, null, p_order_id);
    else
      perform private.move_stock(p_business_id, v_line.product_id, 'sale', -v_line.quantity, null, null, null, p_order_id);
    end if;
  end loop;
end;
$$;

-- Anular: en cualquier estado menos anulado; motivo de 1 a 120 letras; devolución de 0 a lo pagado, con un medio activo
create function private.cancel_order(
  p_request_id uuid, p_order_id uuid, p_reason text, p_refund_cents integer, p_refund_method text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_order public.orders%rowtype;
  v_reason text := btrim(p_reason);
  v_refund integer := coalesce(p_refund_cents, 0);
  v_refund_id uuid;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'cancel_order',
    md5(concat_ws('|', p_order_id, p_reason, p_refund_cents, p_refund_method)));
  if v_saved is not null then
    return v_saved;
  end if;

  select o.* into v_order from public.orders o where o.business_id = v_business_id and o.id = p_order_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_order.status = 'cancelled' or v_reason is null or length(v_reason) not between 1 and 120
    or v_refund not between 0 and v_order.paid_cents then
    perform private.fail('invalid');
  end if;
  if v_refund > 0 and (p_refund_method is null or not exists (
    select 1 from public.business_settings s
    where s.business_id = v_business_id and p_refund_method = any (s.active_payment_methods::text[])
  )) then
    perform private.fail('invalid');
  end if;

  if v_refund > 0 then
    insert into public.payments (business_id, order_id, kind, method, amount_cents)
    values (v_business_id, p_order_id, 'refund', p_refund_method::public.payment_method, v_refund)
    returning id into v_refund_id;
  end if;
  perform private.move_order_stock(v_business_id, p_order_id, true);
  update public.orders o
  set status = 'cancelled', cancel_reason = v_reason, paid_cents = o.paid_cents - v_refund, version = o.version + 1
  where o.id = p_order_id;
  insert into public.order_status_events (business_id, order_id, status, at)
  values (v_business_id, p_order_id, 'cancelled', clock_timestamp());

  if v_order.customer_id is not null then
    update public.customers c
    set orders_count = greatest(c.orders_count - 1, 0),
        spent_cents = greatest(c.spent_cents - v_order.total_cents, 0),
        version = c.version + 1
    where c.business_id = v_business_id and c.id = v_order.customer_id;
  end if;

  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'orders', p_order_id, 'update',
    jsonb_build_object('kind', 'cancel', 'refundId', v_refund_id, 'status', v_order.status),
    jsonb_build_object('version', v_order.version + 1), (select auth.uid()));

  return private.complete_request(v_business_id, p_request_id, private.order_json(p_order_id));
end;
$$;

-- El «Deshacer» de una anulación: solo si la anulación es el último cambio del pedido y de hace menos de 10 minutos.
-- Vuelve al estado anterior, vuelve a restar el stock, anula la devolución y repone los totales del cliente
create function private.revert_cancel(p_order_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_order public.orders%rowtype;
  v_event public.order_status_events%rowtype;
  v_previous text;
  v_last private.audit_log%rowtype;
  v_refund public.payments%rowtype;
begin
  select o.* into v_order from public.orders o where o.business_id = v_business_id and o.id = p_order_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_order.status <> 'cancelled' then
    perform private.fail('conflict');
  end if;

  select e.* into v_event from public.order_status_events e
  where e.business_id = v_business_id and e.order_id = p_order_id and e.reverted_at is null
  order by e.at desc, e.id desc limit 1;
  select e.status into v_previous from public.order_status_events e
  where e.business_id = v_business_id and e.order_id = p_order_id and e.reverted_at is null and e.id <> v_event.id
  order by e.at desc, e.id desc limit 1;
  select a.* into v_last from private.audit_log a
  where a.business_id = v_business_id and a.table_name = 'orders' and a.row_id = p_order_id
  order by a.changed_at desc, a.id desc limit 1;
  if v_event.status is distinct from 'cancelled' or v_event.at < now() - interval '10 minutes' or v_previous is null
    or v_last.old_data ->> 'kind' is distinct from 'cancel' then
    perform private.fail('invalid');
  end if;

  update public.order_status_events e set reverted_at = now() where e.id = v_event.id;
  perform private.move_order_stock(v_business_id, p_order_id, false);
  if v_last.old_data ->> 'refundId' is not null then
    update public.payments p
    set voided_at = now(), void_reason = 'Deshacer anulación'
    where p.business_id = v_business_id and p.id = (v_last.old_data ->> 'refundId')::uuid and p.voided_at is null
    returning p.* into v_refund;
  end if;
  update public.orders o
  set status = v_previous,
      cancel_reason = null,
      paid_cents = o.paid_cents + coalesce(v_refund.amount_cents, 0),
      version = o.version + 1
  where o.id = p_order_id;

  if v_order.customer_id is not null then
    update public.customers c
    set orders_count = c.orders_count + 1, spent_cents = c.spent_cents + v_order.total_cents, version = c.version + 1
    where c.business_id = v_business_id and c.id = v_order.customer_id;
  end if;

  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'orders', p_order_id, 'update', jsonb_build_object('kind', 'revert_cancel'),
    jsonb_build_object('version', v_order.version + 1), (select auth.uid()));

  return private.order_json(p_order_id);
end;
$$;

create function public.cancel_order(
  p_request_id uuid, p_order_id uuid, p_reason text, p_refund_cents integer, p_refund_method text
) returns jsonb
language sql
set search_path = ''
as $$
  select private.cancel_order(p_request_id, p_order_id, p_reason, p_refund_cents, p_refund_method);
$$;

create function public.revert_cancel(p_order_id uuid) returns jsonb
language sql
set search_path = ''
as $$
  select private.revert_cancel(p_order_id);
$$;

grant execute on function public.cancel_order(uuid, uuid, text, integer, text) to authenticated;
grant execute on function public.revert_cancel(uuid) to authenticated;
grant execute on function private.cancel_order(uuid, uuid, text, integer, text) to authenticated;
grant execute on function private.revert_cancel(uuid) to authenticated;
