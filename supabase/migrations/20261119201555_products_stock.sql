-- Productos, stock y lo que falta copiar a la web (docs/spec/products.md y stock.md).
-- Se lee con reglas de acceso; se escribe solo por funciones (las de las dos migraciones que siguen).

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  name text not null constraint products_name_length check (length(btrim(name)) between 1 and 40),
  price_cents public.positive_cents not null constraint products_price_max check (price_cents <= 1000000),
  cost_cents public.positive_cents constraint products_cost_max check (cost_cents <= 1000000),
  min_stock integer not null default 0 constraint products_min_stock_range check (min_stock between 0 and 9999),
  show_on_web boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  -- El documento del producto en la web (Sanity). Vacío = no está enlazado: nada se copia a la web
  sanity_id text constraint products_sanity_id_length check (length(sanity_id) between 1 and 100),
  image_url text constraint products_image_url_https check (image_url ~ '^https://'),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Para que las tablas hijas apunten con (business_id, product_id): ninguna fila apunta al producto de otro negocio
  constraint products_business_id_id_key unique (business_id, id)
);

-- Que no se repitan los nombres (sin importar mayúsculas), la lista de la app y el enlace con la web
create unique index products_business_id_lower_name_key on public.products (business_id, lower(name));
create index products_business_id_sort_order_idx on public.products (business_id, sort_order) where is_active;
create unique index products_sanity_id_key on public.products (sanity_id) where sanity_id is not null;

-- El stock libre de cada alfajor: la suma de sus movimientos, guardada en la misma operación que cada uno.
-- Cambia con cada venta: el espacio libre deja actualizarla sin reescribir sus índices
create table public.stock_levels (
  business_id uuid not null,
  product_id uuid not null,
  on_hand integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, product_id),
  constraint stock_levels_product_fkey foreign key (business_id, product_id) references public.products (business_id, id)
) with (fillfactor = 70);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  kind text not null constraint stock_movements_kind_known check (kind in ('production', 'sale', 'cancellation', 'waste', 'adjustment')),
  quantity integer not null,
  reason text,
  -- El registro que lo creó (producción, merma o conteo): así se deshace entero
  request_id uuid,
  -- En un «deshacer», el movimiento que deshace
  reverts_movement_id uuid,
  happened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_movements_business_id_id_key unique (business_id, id),
  constraint stock_movements_product_fkey foreign key (business_id, product_id) references public.products (business_id, id),
  constraint stock_movements_reverts_fkey foreign key (business_id, reverts_movement_id) references public.stock_movements (business_id, id),
  constraint stock_movements_quantity_sign check (
    (kind in ('production', 'cancellation') and quantity > 0)
    or (kind in ('sale', 'waste') and quantity < 0)
    or (kind = 'adjustment' and quantity <> 0)
  ),
  constraint stock_movements_reason_by_kind check (
    case kind
      when 'waste' then reason is not null and reason in ('broken', 'expired', 'gift', 'other')
      when 'adjustment' then reason is not null and reason in ('count', 'initial', 'undo')
      else reason is null
    end
  ),
  -- «is not distinct from»: con un motivo vacío, «=» daría null y la regla pasaría
  constraint stock_movements_undo_points_back check ((reason is not distinct from 'undo') = (reverts_movement_id is not null))
);

-- El historial de un alfajor y su cursor; nada se deshace dos veces (los vacíos no chocan); deshacer un registro
create index stock_movements_history_idx on public.stock_movements (business_id, product_id, happened_at desc, id desc);
create unique index stock_movements_business_id_reverts_movement_id_key on public.stock_movements (business_id, reverts_movement_id);
create index stock_movements_business_id_request_id_idx on public.stock_movements (business_id, request_id) where request_id is not null;

-- Lo que falta copiar a la web. Solo productos enlazados; lo envía la función sync-to-web (fase 8)
create table private.web_sync_outbox (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  product_id uuid not null,
  payload jsonb not null constraint web_sync_outbox_payload_shape check (
    jsonb_typeof(payload) = 'object'
    -- las tres claves tienen que estar: sin esta línea, una clave ausente da null y la regla pasaría
    and payload ?& array['priceMinor', 'isAvailable', 'isVisible']
    and payload - 'priceMinor' - 'isAvailable' - 'isVisible' = '{}'::jsonb
    and jsonb_typeof(payload -> 'priceMinor') = 'number'
    and jsonb_typeof(payload -> 'isAvailable') = 'boolean'
    and jsonb_typeof(payload -> 'isVisible') = 'boolean'
  ),
  attempts integer not null default 0 constraint web_sync_outbox_attempts_min check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint web_sync_outbox_product_fkey foreign key (business_id, product_id) references public.products (business_id, id)
);

create index web_sync_outbox_business_id_product_id_idx on private.web_sync_outbox (business_id, product_id);
-- Lo pendiente, del más viejo al más nuevo
create index web_sync_outbox_pending_idx on private.web_sync_outbox (created_at) where sent_at is null;

alter table public.products enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;
alter table private.web_sync_outbox enable row level security;

create trigger set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.stock_levels
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.stock_movements
  for each row execute function private.set_updated_at();

-- «¿Cuándo subí el precio?»
create trigger audit_changes after update on public.products
  for each row execute function private.audit_changes('price_cents', 'show_on_web');

create policy products_owner_reads on public.products
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy stock_levels_owner_reads on public.stock_levels
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy stock_movements_owner_reads on public.stock_movements
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));

grant select on public.products, public.stock_levels, public.stock_movements to authenticated;

-- El pendiente de la fase 1: vigilar una columna que la fila no tiene es un error de quien escribió el trigger,
-- y antes se callaba (no guardaba nada). Ahora falla
create or replace function private.audit_changes() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_old_data jsonb := '{}'::jsonb;
  v_new_data jsonb := '{}'::jsonb;
  v_column text;
begin
  if tg_op <> 'UPDATE' then
    raise exception 'audit_changes solo vigila update' using errcode = 'XX000';
  end if;

  foreach v_column in array tg_argv loop
    if not (v_new ? v_column) then
      raise exception 'audit_changes: % no tiene la columna %', tg_table_name, v_column using errcode = 'XX000';
    end if;
    if (v_old -> v_column) is distinct from (v_new -> v_column) then
      v_old_data := v_old_data || jsonb_build_object(v_column, v_old -> v_column);
      v_new_data := v_new_data || jsonb_build_object(v_column, v_new -> v_column);
    end if;
  end loop;

  if v_new_data <> '{}'::jsonb then
    insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
    values (
      coalesce(v_new ->> 'business_id', v_new ->> 'id')::uuid,
      tg_table_name,
      coalesce(v_new ->> 'id', v_new ->> 'business_id')::uuid,
      'update',
      v_old_data,
      v_new_data,
      auth.uid()
    );
  end if;
  return null;
end;
$$;
