-- Cambiar el medio de un pago o de una devolución, y Por cobrar (docs/spec/orders.md §3).

-- Corrige el medio: anula el movimiento («cambio de medio de pago») y crea otro igual (tipo, monto y fecha) con el
-- medio correcto. Así lo cobrado por medio de ese día y el cuadre se corrigen solos; lo pagado del pedido no cambia
create function private.change_payment_method(p_request_id uuid, p_payment_id uuid, p_method text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_payment public.payments%rowtype;
  v_version integer;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'change_payment_method',
    md5(concat_ws('|', p_payment_id, p_method)));
  if v_saved is not null then
    return v_saved;
  end if;

  select p.* into v_payment from public.payments p where p.business_id = v_business_id and p.id = p_payment_id;
  if not found then
    perform private.fail('not_found');
  end if;
  -- El pedido primero y después el pago, como el resto: dos cambios del mismo pedido van en fila
  update public.orders o set version = o.version + 1 where o.id = v_payment.order_id returning o.version into v_version;
  select p.* into v_payment from public.payments p where p.id = p_payment_id for update;
  if v_payment.voided_at is not null or p_method is null or v_payment.method::text = p_method or not exists (
    select 1 from public.business_settings s
    where s.business_id = v_business_id and p_method = any (s.active_payment_methods::text[])
  ) then
    perform private.fail('invalid');
  end if;

  update public.payments p set voided_at = now(), void_reason = 'cambio de medio de pago' where p.id = p_payment_id;
  insert into public.payments (business_id, order_id, kind, method, amount_cents, paid_at)
  values (v_business_id, v_payment.order_id, v_payment.kind, p_method::public.payment_method, v_payment.amount_cents,
    v_payment.paid_at);

  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'orders', v_payment.order_id, 'update',
    jsonb_build_object('kind', 'change_method', 'paymentId', p_payment_id, 'method', v_payment.method),
    jsonb_build_object('version', v_version, 'method', p_method), (select auth.uid()));

  return private.complete_request(v_business_id, p_request_id, private.order_json(v_payment.order_id));
end;
$$;

-- Por cobrar: los pedidos con saldo y sin anular, del número mayor al menor (el índice de por cobrar), por páginas.
-- «remind»: ya se entregó o hay un adelanto (la nota de la maqueta). El cursor es el número del último, como texto
create function public.list_receivables(p_limit integer default 20, p_cursor text default null) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_limit integer := coalesce(p_limit, 20);
  v_total integer;
  v_due integer;
  v_items jsonb;
  v_has_more boolean;
begin
  if v_limit < 1 or p_cursor !~ '^[0-9]{1,9}$' then
    perform private.fail('invalid');
  end if;
  v_limit := least(v_limit, 50);
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select count(*)::integer, coalesce(sum(o.total_cents - o.paid_cents), 0)::integer into v_total, v_due
  from public.orders o
  where o.business_id = v_business_id and o.paid_cents < o.total_cents and o.status <> 'cancelled';

  -- Se pide uno de más: si llega, hay otra página
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'number', x.number, 'customerName', x.customer_name, 'customerPhone', x.phone,
           'fulfillment', x.fulfillment, 'status', x.status, 'totalCents', x.total_cents::integer,
           'paidCents', x.paid_cents::integer, 'dueDate', x.due_date, 'scheduledFor', x.scheduled_for,
           'remind', x.status = 'delivered' or x.paid_cents > 0
         ) order by x.number desc), '[]'::jsonb)
  into v_items
  from (
    select o.id, o.number, o.customer_name, c.phone, o.fulfillment, o.status, o.total_cents, o.paid_cents, o.due_date,
           o.scheduled_for
    from public.orders o
    left join public.customers c on c.business_id = o.business_id and c.id = o.customer_id
    where o.business_id = v_business_id and o.paid_cents < o.total_cents and o.status <> 'cancelled'
      and (p_cursor is null or o.number < p_cursor::integer)
    order by o.number desc
    limit v_limit + 1
  ) x;

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
      'nextCursor', case when v_has_more then v_items -> -1 ->> 'number' end,
      'totalDueCents', v_due
    )
  );
end;
$$;

create function public.change_payment_method(p_request_id uuid, p_payment_id uuid, p_method text) returns jsonb
language sql
set search_path = ''
as $$
  select private.change_payment_method(p_request_id, p_payment_id, p_method);
$$;

grant execute on function public.change_payment_method(uuid, uuid, text) to authenticated;
grant execute on function private.change_payment_method(uuid, uuid, text) to authenticated;
grant execute on function public.list_receivables(integer, text) to authenticated;
