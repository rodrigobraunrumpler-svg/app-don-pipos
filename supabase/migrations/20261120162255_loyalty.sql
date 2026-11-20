-- Fidelidad: la tarjeta de sellos (docs/spec/loyalty.md, D15). Apagada hasta que el dueño la defina; la fila de cada
-- negocio guarda, apagada, la regla de ejemplo de PROJECT_CONTEXT §7 (10 compras, 1 alfajor gratis). Los sellos de cada
-- pedido los deja justos private.sync_order_stamps, que llaman entregar, deshacer, anular y deshacer la anulación (corregir
-- un pedido entregado no existe); el canje va dentro de create_order. Se lee con las reglas de acceso; se escribe solo
-- por funciones de private

create table public.loyalty_settings (
  business_id uuid primary key references public.businesses (id),
  is_active boolean not null default false,
  stamp_unit text not null default 'order' constraint loyalty_settings_stamp_unit_known check (stamp_unit in ('order', 'item')),
  goal integer not null default 10,
  reward_kind text not null default 'free_item'
    constraint loyalty_settings_reward_kind_known check (reward_kind in ('free_item', 'discount', 'other')),
  reward_amount_cents public.positive_cents
    constraint loyalty_settings_reward_amount_max check (reward_amount_cents <= 100000),
  reward_text text constraint loyalty_settings_reward_text_length check (length(btrim(reward_text)) between 1 and 60),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loyalty_settings_goal_range check (
    (stamp_unit = 'order' and goal between 3 and 30) or (stamp_unit = 'item' and goal between 5 and 100)
  ),
  constraint loyalty_settings_discount_has_amount check (reward_kind <> 'discount' or reward_amount_cents is not null),
  constraint loyalty_settings_other_has_text check (reward_kind <> 'other' or reward_text is not null)
);

create table public.loyalty_stamps (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  customer_id uuid not null,
  order_id uuid,
  delta integer not null constraint loyalty_stamps_delta_not_zero check (delta <> 0),
  reason text not null
    constraint loyalty_stamps_reason_known check (reason in ('delivered', 'reverted', 'redeemed', 'redeem_returned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loyalty_stamps_customer_fkey foreign key (business_id, customer_id) references public.customers (business_id, id),
  constraint loyalty_stamps_order_fkey foreign key (business_id, order_id) references public.orders (business_id, id)
);

-- La tarjeta de un cliente; el neto de sellos de un pedido (entero: la regla de estructura pide índices completos para
-- las llaves); «Cerca del premio»
create index loyalty_stamps_business_id_customer_id_idx on public.loyalty_stamps (business_id, customer_id, created_at desc);
create index loyalty_stamps_business_id_order_id_idx on public.loyalty_stamps (business_id, order_id);
create index customers_business_id_stamps_idx on public.customers (business_id, stamps desc) where stamps > 0;

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_stamps enable row level security;
create trigger set_updated_at before update on public.loyalty_settings for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.loyalty_stamps for each row execute function private.set_updated_at();
-- Cada cambio de la fidelidad queda en el registro (loyalty.md §3)
create trigger audit_changes after update on public.loyalty_settings
  for each row execute function private.audit_changes(
    'is_active', 'stamp_unit', 'goal', 'reward_kind', 'reward_amount_cents', 'reward_text'
  );
create policy loyalty_settings_owner_reads on public.loyalty_settings
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy loyalty_stamps_owner_reads on public.loyalty_stamps
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));
grant select on public.loyalty_settings, public.loyalty_stamps to authenticated;

-- Cada negocio nace con su fidelidad, apagada; los que ya existían también la reciben
create or replace function private.init_business() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_settings (business_id) values (new.id);
  insert into private.business_counters (business_id) values (new.id);
  insert into public.message_templates (business_id, key, body)
  select new.id, t.key, t.body from private.default_templates() t;
  insert into public.loyalty_settings (business_id) values (new.id);
  return null;
end;
$$;

insert into public.loyalty_settings (business_id) select b.id from public.businesses b on conflict (business_id) do nothing;

create function private.loyalty_json(p_settings public.loyalty_settings) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'isActive', p_settings.is_active,
    'stampUnit', p_settings.stamp_unit,
    'goal', p_settings.goal,
    'rewardKind', p_settings.reward_kind,
    'rewardAmountCents', p_settings.reward_amount_cents::integer,
    'rewardText', p_settings.reward_text,
    'version', p_settings.version
  );
$$;

create function public.get_loyalty_settings() returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_settings public.loyalty_settings%rowtype;
begin
  select l.* into v_settings from public.loyalty_settings l
  where l.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1);
  if not found then
    perform private.fail('not_found');
  end if;
  return private.loyalty_json(v_settings);
end;
$$;

-- Cambiar la fidelidad: la meta de 3 a 30 por compra y de 5 a 100 por alfajor; un descuento con su monto (hasta S/ 1,000)
-- y otro premio con su texto (hasta 60 caracteres). El monto y el texto quedan solo si son de su premio. Con otra
-- versión, conflict
create function private.update_loyalty_settings(
  p_expected_version integer, p_is_active boolean, p_stamp_unit text, p_goal integer, p_reward_kind text,
  p_reward_amount_cents integer, p_reward_text text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_settings public.loyalty_settings%rowtype;
  v_text text := nullif(btrim(p_reward_text), '');
begin
  select l.* into v_settings from public.loyalty_settings l where l.business_id = v_business_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_is_active is null or p_stamp_unit is null or p_stamp_unit not in ('order', 'item') or p_goal is null
    or (p_stamp_unit = 'order' and p_goal not between 3 and 30) or (p_stamp_unit = 'item' and p_goal not between 5 and 100)
    or p_reward_kind is null or p_reward_kind not in ('free_item', 'discount', 'other')
    or (p_reward_kind = 'discount' and coalesce(p_reward_amount_cents, 0) not between 1 and 100000)
    or (p_reward_kind = 'other' and coalesce(length(v_text), 0) not between 1 and 60) then
    perform private.fail('invalid');
  end if;
  if v_settings.version is distinct from p_expected_version then
    perform private.fail('conflict');
  end if;
  update public.loyalty_settings l
  set is_active = p_is_active, stamp_unit = p_stamp_unit, goal = p_goal, reward_kind = p_reward_kind,
      reward_amount_cents = case when p_reward_kind = 'discount' then p_reward_amount_cents end,
      reward_text = case when p_reward_kind = 'other' then v_text end,
      version = l.version + 1
  where l.business_id = v_business_id
  returning l.* into v_settings;
  return private.loyalty_json(v_settings);
end;
$$;

create function public.update_loyalty_settings(
  p_expected_version integer, p_is_active boolean, p_stamp_unit text, p_goal integer, p_reward_kind text,
  p_reward_amount_cents integer, p_reward_text text
) returns jsonb
language sql
set search_path = ''
as $$
  select private.update_loyalty_settings(p_expected_version, p_is_active, p_stamp_unit, p_goal, p_reward_kind,
    p_reward_amount_cents, p_reward_text);
$$;

-- «Cerca del premio»: con la fidelidad activa, los que tienen la meta − 2 sellos o más, de más a menos
create function public.loyalty_overview(p_limit integer default 10) returns jsonb
language sql
stable
set search_path = ''
as $$
  with settings as (
    select l.* from public.loyalty_settings l
    where l.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1)
  )
  select jsonb_build_object(
    'goal', s.goal,
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object('customerId', c.id, 'name', c.name, 'stamps', c.stamps) order by c.stamps desc, lower(c.name))
      from (
        select c.* from public.customers c
        where c.business_id = s.business_id and s.is_active and c.stamps > 0 and c.stamps >= s.goal - 2
          and c.anonymized_at is null
        order by c.stamps desc, lower(c.name)
        limit least(greatest(coalesce(p_limit, 10), 1), 50)
      ) c
    ), '[]'::jsonb)
  )
  from settings s;
$$;

-- Deja los sellos de un pedido justos, con el pedido y su cliente bloqueados:
-- - los de la entrega: 1 (o sus alfajores, por alfajor) si está entregado, tiene cliente y la fidelidad está activa; 0
--   si no está entregado. Apagada, no suma pero sí quita. Quitar nunca deja al cliente en menos de 0 (ya pudo canjearlos);
-- - los del canje: anulado el pedido, vuelven; si deja de estar anulado, se vuelven a canjear, o conflict si ya no los tiene.
-- Así entregar, deshacer, volver a entregar o anular, una o varias veces, suma una sola vez
create function private.sync_order_stamps(p_order_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_settings public.loyalty_settings%rowtype;
  v_have integer;
  v_current integer;
  v_target integer;
  v_redeemed integer;
  v_delta integer;
begin
  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found or v_order.customer_id is null then
    return;
  end if;
  select l.* into v_settings from public.loyalty_settings l where l.business_id = v_order.business_id;
  select c.stamps into v_have from public.customers c
  where c.business_id = v_order.business_id and c.id = v_order.customer_id for update;

  select coalesce(sum(s.delta), 0)::integer into v_current from public.loyalty_stamps s
  where s.business_id = v_order.business_id and s.order_id = p_order_id and s.reason in ('delivered', 'reverted');
  v_target := case
    when v_order.status <> 'delivered' then 0
    when not coalesce(v_settings.is_active, false) then v_current
    when v_settings.stamp_unit = 'item' then v_order.items_count
    else 1
  end;
  v_delta := greatest(v_target - v_current, -v_have);
  if v_delta <> 0 then
    insert into public.loyalty_stamps (business_id, customer_id, order_id, delta, reason)
    values (v_order.business_id, v_order.customer_id, p_order_id, v_delta,
      case when v_delta > 0 then 'delivered' else 'reverted' end);
    v_have := v_have + v_delta;
  end if;

  select s.delta into v_redeemed from public.loyalty_stamps s
  where s.business_id = v_order.business_id and s.order_id = p_order_id and s.reason = 'redeemed'
  order by s.created_at, s.id limit 1;
  if v_redeemed is not null then
    select coalesce(sum(s.delta), 0)::integer into v_current from public.loyalty_stamps s
    where s.business_id = v_order.business_id and s.order_id = p_order_id and s.reason in ('redeemed', 'redeem_returned');
    v_delta := case when v_order.status = 'cancelled' then 0 else v_redeemed end - v_current;
    if v_have + v_delta < 0 then
      perform private.fail('conflict');
    end if;
    if v_delta <> 0 then
      insert into public.loyalty_stamps (business_id, customer_id, order_id, delta, reason)
      values (v_order.business_id, v_order.customer_id, p_order_id, v_delta,
        case when v_delta > 0 then 'redeem_returned' else 'redeemed' end);
      v_have := v_have + v_delta;
    end if;
  end if;

  update public.customers c set stamps = v_have
  where c.business_id = v_order.business_id and c.id = v_order.customer_id and c.stamps <> v_have;
end;
$$;

-- El pedido trae los sellos de su cliente (el mensaje de entregado los dice)
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
      select jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'address', c.address, 'stamps', c.stamps)
      from public.customers c where c.business_id = o.business_id and c.id = o.customer_id
    )
  )
  from public.orders o
  where o.id = p_order_id;
$$;

-- Entregar, deshacer, anular y deshacer la anulación dejan los sellos justos; anotar canjea el premio si se pide
create or replace function private.advance_order(p_order_id uuid, p_from_status text) returns jsonb
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
  perform private.sync_order_stamps(p_order_id);
  return private.order_json(p_order_id);
end;
$$;

create or replace function private.revert_status(p_order_id uuid, p_expected_status text) returns jsonb
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
  perform private.sync_order_stamps(p_order_id);
  return private.order_json(p_order_id);
end;
$$;

create or replace function private.cancel_order(
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

  perform private.sync_order_stamps(p_order_id);
  return private.complete_request(v_business_id, p_request_id, private.order_json(p_order_id));
end;
$$;

create or replace function private.revert_cancel(p_order_id uuid) returns jsonb
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

  perform private.sync_order_stamps(p_order_id);
  return private.order_json(p_order_id);
end;
$$;

create or replace function private.create_order(p_request_id uuid, p_draft jsonb) returns jsonb
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
  v_redeem boolean;
  v_loyalty public.loyalty_settings%rowtype;
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
  -- El premio de fidelidad (D15): con la fidelidad activa y sin otro descuento; el monto lo calcula la base
  if coalesce(jsonb_typeof(p_draft -> 'redeemReward'), 'null') not in ('null', 'boolean') then
    perform private.fail('invalid');
  end if;
  v_redeem := coalesce((p_draft ->> 'redeemReward')::boolean, false);
  if v_redeem then
    select l.* into v_loyalty from public.loyalty_settings l where l.business_id = v_business_id;
    if v_discount > 0 or not coalesce(v_loyalty.is_active, false) then
      perform private.fail('invalid');
    end if;
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
  -- El premio: el alfajor más barato del pedido, el descuento sin pasar del total, u otro premio (se entrega aparte)
  if v_redeem then
    v_discount := case v_loyalty.reward_kind
      when 'free_item' then (
        select min(p.price_cents)::integer
        from private.stock_items(v_business_id, p_draft -> 'lines', 'quantity', 1, 10000) i
        join public.products p on p.id = i.product_id)
      when 'discount' then least(v_loyalty.reward_amount_cents, v_subtotal + v_fee)
      else 0
    end;
    v_reason := case when v_discount > 0 then 'Fidelidad' end;
  end if;
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

  if v_redeem and v_customer.stamps < v_loyalty.goal then
    perform private.fail('invalid');
  end if;

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

  -- El canje resta la meta en la misma operación
  if v_redeem then
    insert into public.loyalty_stamps (business_id, customer_id, order_id, delta, reason)
    values (v_business_id, v_customer.id, v_order_id, -v_loyalty.goal, 'redeemed');
    update public.customers c set stamps = c.stamps - v_loyalty.goal where c.id = v_customer.id;
  end if;

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

grant execute on function public.get_loyalty_settings(), public.loyalty_overview(integer),
  public.update_loyalty_settings(integer, boolean, text, integer, text, integer, text),
  private.update_loyalty_settings(integer, boolean, text, integer, text, integer, text),
  private.loyalty_json(public.loyalty_settings) to authenticated;
