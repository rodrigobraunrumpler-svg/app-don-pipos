-- Avanzar un pedido, deshacer su último estado y cobrar (docs/spec/orders.md). Lo apartado del stock ya lee los pedidos.

-- Lo que llevan los pedidos sin entregar ni anular, por alfajor (con el índice de pedidos en curso, que son pocos)
create or replace function private.reserved_stock(p_business_id uuid) returns table (product_id uuid, reserved integer)
language sql
stable
set search_path = ''
as $$
  select l.product_id, sum(l.quantity)::integer
  from public.orders o
  join public.order_lines l on l.business_id = o.business_id and l.order_id = o.id
  where o.business_id = p_business_id and o.status not in ('delivered', 'cancelled')
  group by l.product_id;
$$;

-- Una venta o una anulación va con su pedido y nunca con un código de registro: el «Deshacer» del stock no puede tocarla
alter table public.stock_movements
  add constraint stock_movements_order_has_no_request check (order_id is null or request_id is null);

-- El siguiente estado según la entrega: nuevo → preparando → en camino (delivery) o listo para recoger → entregado.
-- p_from_status es el estado que vio la app: si ya cambió (dos toques, otro teléfono), conflicto
create function private.advance_order(p_order_id uuid, p_from_status text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_order public.orders%rowtype;
  v_next text;
  -- clock_timestamp: dentro de una misma transacción cada estado queda después del anterior
  v_at timestamptz := clock_timestamp();
begin
  select o.* into v_order from public.orders o where o.business_id = v_business_id and o.id = p_order_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_order.status is distinct from p_from_status then
    perform private.fail('conflict');
  end if;
  -- Entregado y anulado no avanzan (el mostrador nace entregado)
  v_next := case v_order.status
    when 'new' then 'preparing'
    when 'preparing' then case v_order.fulfillment when 'delivery' then 'on_the_way' else 'ready' end
    when 'on_the_way' then 'delivered'
    when 'ready' then 'delivered'
  end;
  if v_next is null then
    perform private.fail('invalid');
  end if;

  update public.orders set
    status = v_next,
    delivered_at = case when v_next = 'delivered' then v_at else delivered_at end,
    version = version + 1
  where id = p_order_id;
  insert into public.order_status_events (business_id, order_id, status, at) values (v_business_id, p_order_id, v_next, v_at);
  return private.order_json(p_order_id);
end;
$$;

-- El «Deshacer» del último estado, dentro de los 10 minutos: marca su evento y vuelve al anterior.
-- p_expected_status es el estado que la app deshace: si ya cambió (un segundo «Deshacer»), conflicto.
-- Una anulación no se deshace aquí: su «Deshacer» también devuelve el stock y los pagos (fase 4b)
create function private.revert_status(p_order_id uuid, p_expected_status text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_order public.orders%rowtype;
  v_last public.order_status_events%rowtype;
  v_previous text;
begin
  select o.* into v_order from public.orders o where o.business_id = v_business_id and o.id = p_order_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_order.status is distinct from p_expected_status then
    perform private.fail('conflict');
  end if;

  select e.* into v_last from public.order_status_events e
  where e.business_id = v_business_id and e.order_id = p_order_id and e.reverted_at is null
  order by e.at desc, e.id desc limit 1;
  select e.status into v_previous from public.order_status_events e
  where e.business_id = v_business_id and e.order_id = p_order_id and e.reverted_at is null and e.id <> v_last.id
  order by e.at desc, e.id desc limit 1;
  if v_order.status = 'cancelled' or v_last.status is distinct from v_order.status
    or v_last.at < now() - interval '10 minutes' or v_previous is null then
    perform private.fail('invalid');
  end if;

  update public.order_status_events set reverted_at = now() where id = v_last.id;
  update public.orders set
    status = v_previous,
    delivered_at = case when v_order.status = 'delivered' then null else delivered_at end,
    version = version + 1
  where id = p_order_id;
  return private.order_json(p_order_id);
end;
$$;

-- Un pago después de anotar: de 1 céntimo hasta lo que falta, con un medio activo y sin anular. El mismo código cobra una vez
create function private.add_payment(p_request_id uuid, p_order_id uuid, p_method text, p_amount_cents integer) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_order public.orders%rowtype;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'add_payment',
    md5(concat_ws('|', p_order_id, p_method, p_amount_cents)));
  if v_saved is not null then
    return v_saved;
  end if;

  select o.* into v_order from public.orders o where o.business_id = v_business_id and o.id = p_order_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_order.status = 'cancelled' or p_amount_cents is null or p_amount_cents < 1
    or p_amount_cents > v_order.total_cents - v_order.paid_cents
    or not exists (
      select 1 from public.business_settings s
      where s.business_id = v_business_id and p_method = any (s.active_payment_methods::text[])
    ) then
    perform private.fail('invalid');
  end if;

  insert into public.payments (business_id, order_id, kind, method, amount_cents)
  values (v_business_id, p_order_id, 'payment', p_method::public.payment_method, p_amount_cents);
  update public.orders set paid_cents = paid_cents + p_amount_cents, version = version + 1 where id = p_order_id;
  return private.complete_request(v_business_id, p_request_id, private.order_json(p_order_id));
end;
$$;

create function public.advance_order(p_order_id uuid, p_from_status text) returns jsonb
language sql
set search_path = ''
as $$
  select private.advance_order(p_order_id, p_from_status);
$$;

create function public.revert_status(p_order_id uuid, p_expected_status text) returns jsonb
language sql
set search_path = ''
as $$
  select private.revert_status(p_order_id, p_expected_status);
$$;

create function public.add_payment(p_request_id uuid, p_order_id uuid, p_method text, p_amount_cents integer) returns jsonb
language sql
set search_path = ''
as $$
  select private.add_payment(p_request_id, p_order_id, p_method, p_amount_cents);
$$;

grant execute on function public.advance_order(uuid, text) to authenticated;
grant execute on function public.revert_status(uuid, text) to authenticated;
grant execute on function public.add_payment(uuid, uuid, text, integer) to authenticated;
grant execute on function private.advance_order(uuid, text) to authenticated;
grant execute on function private.revert_status(uuid, text) to authenticated;
grant execute on function private.add_payment(uuid, uuid, text, integer) to authenticated;
