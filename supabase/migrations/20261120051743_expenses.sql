-- Gastos (docs/spec/expenses.md): los tipos, los gastos y el bucket privado de las boletas. Se lee con reglas de
-- acceso; se escribe solo por funciones. Corregir, anular, deshacer, la lista y el resumen llegan en la que sigue.

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  name text not null constraint expense_categories_name_length check (length(btrim(name)) between 1 and 40),
  -- El nombre de un ícono de la app; si no lo conoce, dibuja el de «otros»
  icon text not null constraint expense_categories_icon_name check (icon ~ '^[a-z0-9-]{1,40}$'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_categories_business_id_id_key unique (business_id, id)
);

-- Que no se repitan los nombres, sin importar mayúsculas
create unique index expense_categories_business_id_lower_name_key on public.expense_categories (business_id, lower(name));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  category_id uuid not null,
  description text constraint expenses_description_length
    check (length(description) between 1 and 120 and description = btrim(description)),
  amount_cents public.positive_cents not null constraint expenses_amount_max check (amount_cents <= 10000000),
  method public.payment_method not null,
  spent_at timestamptz not null default now(),
  -- La foto en el bucket privado, siempre en «<negocio>/<gasto>.jpg»
  receipt_path text constraint expenses_receipt_path_shape check (receipt_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  voided_at timestamptz,
  void_reason text constraint expenses_void_reason_length check (length(btrim(void_reason)) between 1 and 120),
  -- Si corrige otro gasto: el viejo queda anulado y el nuevo lo apunta
  replaces_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_business_id_id_key unique (business_id, id),
  constraint expenses_category_fkey foreign key (business_id, category_id)
    references public.expense_categories (business_id, id),
  constraint expenses_replaces_fkey foreign key (business_id, replaces_id) references public.expenses (business_id, id),
  constraint expenses_void_has_reason check ((voided_at is null) = (void_reason is null))
);

-- La lista (con el id para el cursor), el total del mes, los reportes y el efectivo del día en el cuadre
create index expenses_spent_at_idx on public.expenses (business_id, spent_at desc, id desc) where voided_at is null;
create index expenses_business_id_category_id_idx on public.expenses (business_id, category_id);
-- Completo, no parcial: la regla de estructura pide un índice entero por cada llave foránea
create index expenses_business_id_replaces_id_idx on public.expenses (business_id, replaces_id);

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

create trigger set_updated_at before update on public.expense_categories
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.expenses
  for each row execute function private.set_updated_at();

create policy expense_categories_owner_reads on public.expense_categories
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));
create policy expenses_owner_reads on public.expenses
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));

grant select on public.expense_categories, public.expenses to authenticated;

-- Las boletas: privadas, en JPEG de hasta 2 MB. El dueño lee, sube y reemplaza solo en la carpeta de su negocio, y
-- solo con la forma «<negocio>/<gasto>.jpg». Nada se borra
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy receipts_owner_reads on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = any ((select private.owned_business_ids())::text[]));
create policy receipts_owner_uploads on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = any ((select private.owned_business_ids())::text[])
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  );
create policy receipts_owner_replaces on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = any ((select private.owned_business_ids())::text[]))
  with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = any ((select private.owned_business_ids())::text[])
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  );

-- Un tipo de gasto como lo ve la app
create function private.category_json(p_category public.expense_categories) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_category.id,
    'name', p_category.name,
    'icon', p_category.icon,
    'isActive', p_category.is_active,
    'sortOrder', p_category.sort_order,
    'version', p_category.version
  );
$$;

-- Un gasto como lo ve la app: con su tipo y, si corrige otro, cuánto era antes
create function private.expense_json(p_expense_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'categoryId', e.category_id,
    'categoryName', c.name,
    'categoryIcon', c.icon,
    'description', e.description,
    'amountCents', e.amount_cents::integer,
    'method', e.method,
    'spentAt', private.iso_time(e.spent_at),
    'receiptPath', e.receipt_path,
    'previousAmountCents', r.amount_cents::integer,
    'voidedAt', private.iso_time(e.voided_at)
  )
  from public.expenses e
  join public.expense_categories c on c.business_id = e.business_id and c.id = e.category_id
  left join public.expenses r on r.business_id = e.business_id and r.id = e.replaces_id
  where e.id = p_expense_id;
$$;

-- Los tipos del negocio, también los apagados, en su orden. Lee con las reglas de acceso, como list_products
create function public.list_expense_categories() returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.category_json(c) order by c.sort_order, lower(c.name), c.id), '[]'::jsonb)
  from public.expense_categories c
  where c.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1);
$$;

-- Crea (sin id, al final) o cambia (con id y la versión que la app tenía) un tipo de gasto
create function private.save_expense_category(p_id uuid, p_expected_version integer, p_name text, p_icon text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_name text := btrim(p_name);
  v_category public.expense_categories%rowtype;
begin
  if v_name is null or length(v_name) not between 1 and 40 or p_icon is null or p_icon !~ '^[a-z0-9-]{1,40}$'
     or (p_id is null) <> (p_expected_version is null) then
    perform private.fail('invalid');
  end if;

  begin
    if p_id is null then
      insert into public.expense_categories (business_id, name, icon, sort_order)
      values (v_business_id, v_name, p_icon,
        coalesce((select max(c.sort_order) from public.expense_categories c where c.business_id = v_business_id), 0) + 1)
      returning * into v_category;
      return private.category_json(v_category);
    end if;

    select c.* into v_category from public.expense_categories c
    where c.business_id = v_business_id and c.id = p_id for update;
    if not found then
      perform private.fail('not_found');
    end if;
    if v_category.version <> p_expected_version then
      perform private.fail('conflict');
    end if;
    update public.expense_categories c set name = v_name, icon = p_icon, version = c.version + 1
    where c.id = p_id
    returning c.* into v_category;
  exception when unique_violation then
    perform private.fail('conflict');
  end;
  return private.category_json(v_category);
end;
$$;

-- Un tipo no se borra: se apaga (deja de salir al anotar un gasto) y se vuelve a encender
create function private.set_category_active(p_id uuid, p_expected_version integer, p_active boolean) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_category public.expense_categories%rowtype;
begin
  if p_active is null or p_expected_version is null then
    perform private.fail('invalid');
  end if;
  select c.* into v_category from public.expense_categories c
  where c.business_id = v_business_id and c.id = p_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_category.version <> p_expected_version then
    perform private.fail('conflict');
  end if;
  update public.expense_categories c set is_active = p_active, version = c.version + 1
  where c.id = p_id
  returning c.* into v_category;
  return private.category_json(v_category);
end;
$$;

-- Anota un gasto: un tipo activo del negocio, un medio activo, un monto razonable y una fecha que ya pasó (sin fecha,
-- ahora). Con el mismo código devuelve el mismo gasto; con otros datos, conflict
create function private.create_expense(
  p_request_id uuid, p_category_id uuid, p_amount_cents integer, p_method text, p_description text, p_spent_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_description text := nullif(btrim(p_description), '');
  v_id uuid;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'create_expense',
    md5(concat_ws('|', p_category_id, p_amount_cents, p_method, p_description, p_spent_at)));
  if v_saved is not null then
    return v_saved;
  end if;

  if p_amount_cents is null or p_amount_cents not between 1 and 10000000 or length(v_description) > 120
     or p_spent_at > now() + interval '5 minutes'
     or not exists (
       select 1 from public.expense_categories c where c.business_id = v_business_id and c.id = p_category_id and c.is_active
     )
     or p_method is null or not exists (
       select 1 from public.business_settings s
       where s.business_id = v_business_id and p_method = any (s.active_payment_methods::text[])
     ) then
    perform private.fail('invalid');
  end if;

  insert into public.expenses (business_id, category_id, description, amount_cents, method, spent_at)
  values (v_business_id, p_category_id, v_description, p_amount_cents, p_method::public.payment_method, coalesce(p_spent_at, now()))
  returning id into v_id;
  return private.complete_request(v_business_id, p_request_id, private.expense_json(v_id));
end;
$$;

-- Después de subir la foto: la ruta tiene que ser la del gasto, en la carpeta de su negocio
create function private.attach_receipt(p_expense_id uuid, p_receipt_path text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_expense public.expenses%rowtype;
begin
  select e.* into v_expense from public.expenses e where e.business_id = v_business_id and e.id = p_expense_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_expense.voided_at is not null or p_receipt_path is distinct from v_business_id::text || '/' || p_expense_id::text || '.jpg' then
    perform private.fail('invalid');
  end if;
  update public.expenses e set receipt_path = p_receipt_path where e.id = p_expense_id;
  return private.expense_json(p_expense_id);
end;
$$;

create function public.save_expense_category(p_id uuid, p_expected_version integer, p_name text, p_icon text) returns jsonb
language sql
set search_path = ''
as $$
  select private.save_expense_category(p_id, p_expected_version, p_name, p_icon);
$$;

create function public.set_category_active(p_id uuid, p_expected_version integer, p_active boolean) returns jsonb
language sql
set search_path = ''
as $$
  select private.set_category_active(p_id, p_expected_version, p_active);
$$;

create function public.create_expense(
  p_request_id uuid, p_category_id uuid, p_amount_cents integer, p_method text, p_description text, p_spent_at timestamptz
) returns jsonb
language sql
set search_path = ''
as $$
  select private.create_expense(p_request_id, p_category_id, p_amount_cents, p_method, p_description, p_spent_at);
$$;

create function public.attach_receipt(p_expense_id uuid, p_receipt_path text) returns jsonb
language sql
set search_path = ''
as $$
  select private.attach_receipt(p_expense_id, p_receipt_path);
$$;

grant execute on function public.list_expense_categories() to authenticated;
grant execute on function public.save_expense_category(uuid, integer, text, text) to authenticated;
grant execute on function public.set_category_active(uuid, integer, boolean) to authenticated;
grant execute on function public.create_expense(uuid, uuid, integer, text, text, timestamptz) to authenticated;
grant execute on function public.attach_receipt(uuid, text) to authenticated;
grant execute on function private.save_expense_category(uuid, integer, text, text) to authenticated;
grant execute on function private.set_category_active(uuid, integer, boolean) to authenticated;
grant execute on function private.create_expense(uuid, uuid, integer, text, text, timestamptz) to authenticated;
grant execute on function private.attach_receipt(uuid, text) to authenticated;
-- Las lecturas de arriba arman el JSON con las reglas de acceso de quien lee
grant execute on function private.category_json(public.expense_categories) to authenticated;
grant execute on function private.expense_json(uuid) to authenticated;
