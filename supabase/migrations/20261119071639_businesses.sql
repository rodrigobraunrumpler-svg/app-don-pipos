-- El negocio, sus ajustes y su contador. Se lee con reglas de acceso; se escribe solo por funciones.

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null constraint businesses_name_length check (length(btrim(name)) between 1 and 60),
  modules text[] not null default '{}' constraint businesses_modules_known check (
    modules <@ array['orders', 'stock', 'products', 'expenses', 'income', 'cash', 'reports', 'customers', 'loyalty', 'messages', 'reminders']::text[]
  ),
  setup_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Las reglas de acceso buscan los negocios del usuario por su dueño
create index businesses_owner_id_idx on public.businesses (owner_id);

create table public.business_settings (
  business_id uuid primary key references public.businesses (id),
  active_payment_methods public.payment_method[] not null default '{cash,yape,plin,transfer}'
    constraint business_settings_payment_methods_count check (cardinality(active_payment_methods) between 1 and 4),
  delivery_fee_cents public.cents not null default 0,
  delivery_zone text constraint business_settings_delivery_zone_length check (length(delivery_zone) <= 120),
  production_interval_days integer not null default 7
    constraint business_settings_production_interval_range check (production_interval_days between 1 and 14),
  lapsed_after_days integer not null default 30
    constraint business_settings_lapsed_after_range check (lapsed_after_days between 7 and 120),
  reminders jsonb not null default '{"scheduled": true, "stock": true, "balances": true}'
    constraint business_settings_reminders_shape check (
      jsonb_typeof(reminders) = 'object'
      -- las tres claves tienen que estar: sin esta línea, una clave ausente da null y la regla pasaría
      and reminders ?& array['scheduled', 'stock', 'balances']
      and reminders - 'scheduled' - 'stock' - 'balances' = '{}'::jsonb
      and jsonb_typeof(reminders -> 'scheduled') = 'boolean'
      and jsonb_typeof(reminders -> 'stock') = 'boolean'
      and jsonb_typeof(reminders -> 'balances') = 'boolean'
    ),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El número del próximo pedido. Solo avanza, y solo lo toca create_order (fase 4)
create table private.business_counters (
  business_id uuid primary key references public.businesses (id),
  next_order_number integer not null default 1 constraint business_counters_next_order_number_min check (next_order_number >= 1)
);

alter table public.businesses enable row level security;
alter table public.business_settings enable row level security;
alter table private.business_counters enable row level security;

create trigger set_updated_at before update on public.businesses
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.business_settings
  for each row execute function private.set_updated_at();

-- Cada negocio nace con su fila de ajustes y su contador
create function private.init_business() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_settings (business_id) values (new.id);
  insert into private.business_counters (business_id) values (new.id);
  return null;
end;
$$;

create trigger init_business after insert on public.businesses
  for each row execute function private.init_business();

-- Los negocios del usuario. La usan todas las reglas de acceso: devuelve una lista para que
-- «= any (…)» se resuelva una sola vez por consulta y pueda usar el índice de la tabla.
create function private.owned_business_ids() returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(b.id), '{}'::uuid[])
  from public.businesses b
  where b.owner_id = (select auth.uid());
$$;

-- El negocio con el que trabaja el usuario. La usan las funciones que escriben.
-- Hoy cada dueño tiene uno; cuando haya varios, aquí se elige el activo.
create function private.current_business_id() returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  select b.id into v_business_id
  from public.businesses b
  where b.owner_id = (select auth.uid())
  order by b.created_at, b.id
  limit 1;

  if v_business_id is null then
    perform private.fail('not_found');
  end if;
  return v_business_id;
end;
$$;

create policy businesses_owner_reads on public.businesses
  for select to authenticated
  using (id = any ((select private.owned_business_ids())::uuid[]));

create policy business_settings_owner_reads on public.business_settings
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));

-- La app solo lee estas dos tablas. Las reglas de acceso llaman a owned_business_ids, así que
-- authenticated tiene que poder entrar a private y ejecutar esa función, y nada más de ahí.
grant select on public.businesses, public.business_settings to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.owned_business_ids() to authenticated;
