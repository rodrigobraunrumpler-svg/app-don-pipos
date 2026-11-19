-- Pedidos, clientes, pagos y textos de WhatsApp (docs/spec/orders.md, customers.md y messages.md).
-- Se lee con reglas de acceso; se escribe solo por funciones (las de las migraciones que siguen).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  name text not null constraint customers_name_length check (length(btrim(name)) between 1 and 60),
  phone public.phone_pe,
  address text constraint customers_address_length check (length(btrim(address)) between 1 and 200),
  note text constraint customers_note_length check (length(btrim(note)) between 1 and 300),
  accepts_promotions boolean not null default false,
  orders_count integer not null default 0 constraint customers_orders_count_min check (orders_count >= 0),
  spent_cents public.cents not null default 0,
  last_order_at timestamptz,
  stamps integer not null default 0 constraint customers_stamps_min check (stamps >= 0),
  anonymized_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_business_id_id_key unique (business_id, id),
  -- Sin teléfono solo si se borraron sus datos (fase 7)
  constraint customers_phone_unless_anonymized check (phone is not null or anonymized_at is not null)
);

-- Un cliente por teléfono en cada negocio, y encontrarlo al anotar un pedido
create unique index customers_business_id_phone_key on public.customers (business_id, phone) where phone is not null;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  number integer not null constraint orders_number_min check (number >= 1),
  customer_id uuid,
  channel text not null constraint orders_channel_known check (channel in ('whatsapp', 'local', 'web')),
  fulfillment text not null constraint orders_fulfillment_known check (fulfillment in ('delivery', 'pickup', 'counter')),
  status text not null
    constraint orders_status_known check (status in ('new', 'preparing', 'on_the_way', 'ready', 'delivered', 'cancelled')),
  promised_at timestamptz,
  scheduled_for date,
  -- El día del pedido: scheduled_for o el día de Lima en que se anotó
  due_date date not null,
  delivery_address text constraint orders_delivery_address_length check (length(btrim(delivery_address)) between 1 and 200),
  delivery_fee_cents public.cents not null default 0,
  discount_cents public.cents not null default 0,
  discount_reason text constraint orders_discount_reason_length check (length(btrim(discount_reason)) between 1 and 60),
  subtotal_cents public.cents not null,
  total_cents public.cents not null,
  paid_cents public.cents not null default 0,
  delivered_at timestamptz,
  cancel_reason text constraint orders_cancel_reason_length check (length(btrim(cancel_reason)) between 1 and 120),
  note text constraint orders_note_length check (length(btrim(note)) between 1 and 300),
  customer_name text,
  items_summary text not null,
  items_count integer not null constraint orders_items_count_min check (items_count > 0),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_business_id_id_key unique (business_id, id),
  -- El número correlativo; «Todos» por páginas sale solo del índice
  constraint orders_business_id_number_key unique (business_id, number)
    include (status, fulfillment, total_cents, paid_cents, customer_name, items_summary, promised_at),
  constraint orders_customer_fkey foreign key (business_id, customer_id) references public.customers (business_id, id),
  constraint orders_total_adds_up check (total_cents = subtotal_cents + delivery_fee_cents - discount_cents),
  constraint orders_paid_within_total check (paid_cents <= total_cents),
  constraint orders_status_fits_fulfillment check (
    (status <> 'on_the_way' or fulfillment = 'delivery') and (status <> 'ready' or fulfillment = 'pickup')
  ),
  constraint orders_counter_is_delivered check (
    fulfillment <> 'counter' or (status in ('delivered', 'cancelled') and customer_id is null)
  ),
  constraint orders_needs_customer check (fulfillment = 'counter' or customer_id is not null),
  constraint orders_delivery_has_address check (fulfillment <> 'delivery' or delivery_address is not null),
  constraint orders_discount_has_reason check (discount_cents = 0 or discount_reason is not null),
  constraint orders_cancelled_has_reason check (status <> 'cancelled' or cancel_reason is not null),
  constraint orders_delivered_has_date check (status <> 'delivered' or delivered_at is not null)
) with (fillfactor = 85);

-- «Hoy» y «Próximos»; lo que sigue en curso (por entregar, atrasados, lo apartado); «Por cobrar»; las ventas por fecha
-- de entrega (D11); y el cliente (la llave foránea y su historial)
create index orders_business_id_due_date_idx on public.orders (business_id, due_date);
create index orders_open_idx on public.orders (business_id, due_date, number desc) where status not in ('delivered', 'cancelled');
create index orders_to_collect_idx on public.orders (business_id, number desc) where paid_cents < total_cents and status <> 'cancelled';
create index orders_delivered_idx on public.orders (business_id, delivered_at) where status = 'delivered';
create index orders_business_id_customer_id_idx on public.orders (business_id, customer_id, created_at desc);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  product_id uuid not null,
  -- El nombre y el precio del momento (D9)
  product_name text not null constraint order_lines_product_name_length check (length(btrim(product_name)) between 1 and 40),
  quantity integer not null constraint order_lines_quantity_range check (quantity between 1 and 10000),
  unit_price_cents public.positive_cents not null,
  unit_cost_cents public.positive_cents,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_lines_order_fkey foreign key (business_id, order_id) references public.orders (business_id, id),
  constraint order_lines_product_fkey foreign key (business_id, product_id) references public.products (business_id, id)
);

create unique index order_lines_business_id_order_id_product_id_key on public.order_lines (business_id, order_id, product_id);
create index order_lines_business_id_product_id_idx on public.order_lines (business_id, product_id);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  status text not null
    constraint order_status_events_status_known check (status in ('new', 'preparing', 'on_the_way', 'ready', 'delivered', 'cancelled')),
  at timestamptz not null default now(),
  -- El «Deshacer» de un estado no borra la fila: la marca, y la línea de tiempo la oculta
  reverted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_status_events_order_fkey foreign key (business_id, order_id) references public.orders (business_id, id)
);

create index order_status_events_order_idx on public.order_status_events (business_id, order_id, at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  kind text not null constraint payments_kind_known check (kind in ('payment', 'refund')),
  method public.payment_method not null,
  amount_cents public.positive_cents not null,
  paid_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text constraint payments_void_reason_length check (length(btrim(void_reason)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_order_fkey foreign key (business_id, order_id) references public.orders (business_id, id),
  constraint payments_void_has_reason check ((voided_at is null) = (void_reason is null))
);

-- Los pagos de un pedido; los ingresos por fecha de pago (D11) y el efectivo del día
create index payments_business_id_order_id_idx on public.payments (business_id, order_id);
create index payments_paid_at_idx on public.payments (business_id, paid_at) where voided_at is null;

create table public.message_templates (
  business_id uuid not null references public.businesses (id),
  key text not null constraint message_templates_key_known check (
    key in ('confirmation', 'on_the_way', 'ready', 'delivered', 'balance_reminder', 'we_miss_you')
  ),
  body text not null constraint message_templates_body_length check (length(btrim(body)) between 1 and 500),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, key)
);

-- La venta y la anulación restan o suman el stock con su pedido; lo demás, sin pedido
alter table public.stock_movements add column order_id uuid;
alter table public.stock_movements
  add constraint stock_movements_order_fkey foreign key (business_id, order_id) references public.orders (business_id, id);
create index stock_movements_business_id_order_id_idx on public.stock_movements (business_id, order_id);
alter table public.stock_movements
  add constraint stock_movements_order_by_kind check ((kind in ('sale', 'cancellation')) = (order_id is not null));

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_status_events enable row level security;
alter table public.payments enable row level security;
alter table public.message_templates enable row level security;

create trigger set_updated_at before update on public.customers for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.orders for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.order_lines for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.order_status_events for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.payments for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.message_templates for each row execute function private.set_updated_at();

-- Cada cambio de un texto de WhatsApp queda en el registro (messages.md §3)
create trigger audit_changes after update on public.message_templates
  for each row execute function private.audit_changes('body');

create policy customers_owner_reads on public.customers
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy orders_owner_reads on public.orders
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy order_lines_owner_reads on public.order_lines
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy order_status_events_owner_reads on public.order_status_events
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy payments_owner_reads on public.payments
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy message_templates_owner_reads on public.message_templates
  for select to authenticated using (business_id = any ((select private.owned_business_ids())::uuid[]));

grant select on public.customers, public.orders, public.order_lines, public.order_status_events, public.payments,
  public.message_templates to authenticated;

-- Los textos por defecto (los de la maqueta). Los usan el negocio nuevo y, en la fase 7, «Volver al texto original»
create function private.default_templates() returns table (key text, body text)
language sql
immutable
set search_path = ''
as $$
  select t.key, t.body from (values
    ('confirmation', 'Hola {nombre}, recibimos tu pedido {numero}: {detalle}. Total: {total}. {adelanto} {entrega} ¡Gracias!'),
    ('on_the_way', 'Hola {nombre}, tu pedido {numero} va en camino. {pago}'),
    ('ready', 'Hola {nombre}, tu pedido {numero} está listo para recoger. {pago}'),
    ('delivered', '¡Gracias por tu compra, {nombre}! {sellos}'),
    ('balance_reminder', 'Hola {nombre}, te recordamos el saldo de tu pedido {numero}: {falta}. Puedes pagar por Yape, Plin, transferencia o efectivo.'),
    ('we_miss_you', 'Hola {nombre}, hace tiempo que no te vemos por Don Pipos. ¿Se te antoja un alfajor esta semana?')
  ) as t (key, body);
$$;

-- Cada negocio nace con sus ajustes, su contador y sus textos de WhatsApp
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
  return null;
end;
$$;

-- Los negocios que ya existían también reciben sus textos
insert into public.message_templates (business_id, key, body)
select b.id, t.key, t.body from public.businesses b cross join private.default_templates() t
on conflict (business_id, key) do nothing;
