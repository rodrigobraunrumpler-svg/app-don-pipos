-- Fase 9 (docs/plan/fase-9-alfajores-web.md): cada alfajor con su descripción, sus alérgenos, su foto y su estado en
-- la web. La copia a la web separa dos tipos de cambio: el estado (precio, stock, si se ve) y el contenido (nombre,
-- descripción, alérgenos, foto), que se manda solo cuando cambia en la app

alter table public.products
  add column description text
    constraint products_description_length check (description is null or length(description) between 1 and 400),
  add column allergens text[] not null default '{}'
    constraint products_allergens_known check (allergens <@ array['gluten', 'lacteos', 'huevo', 'pescado', 'crustaceos',
      'moluscos', 'mani', 'frutos-secos', 'soya', 'ajonjoli', 'mostaza', 'apio', 'sulfitos']::text[]),
  -- La foto que subió el dueño (bucket product-photos), y la última que ya se subió a la web
  add column photo_path text constraint products_photo_path_length check (length(photo_path) between 1 and 300),
  add column web_photo_path text constraint products_web_photo_path_length check (length(web_photo_path) between 1 and 300),
  -- Su dirección en la web (/don-pipos/<slug>) y desde cuándo sale ahí: «Nuevo» por 30 días
  add column web_slug text constraint products_web_slug_shape check (web_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(web_slug) <= 96),
  add column web_published_at timestamptz;

alter table private.web_sync_outbox
  add column kind text not null default 'state' constraint web_sync_outbox_kind check (kind in ('state', 'content'));

-- Las fotos de los alfajores: privadas, de hasta 4 MB y solo JPEG, en <negocio>/<alfajor>/<uuid>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', false, 4194304, array['image/jpeg'])
on conflict (id) do nothing;

create policy product_photos_owner_reads on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = any ((select private.owned_business_ids())::text[]));
create policy product_photos_owner_uploads on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-photos' and (storage.foldername(name))[1] = any ((select private.owned_business_ids())::text[])
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  );

-- Anota un cambio para la web. Además de los enlazados, el contenido de los que se ven en la web y todavía no están:
-- la copia los crea cuando tengan foto y descripción. Su precio o su stock no: allá todavía no hay nada que cambiar
drop function private.queue_web_sync(uuid);
create function private.queue_web_sync(p_product_id uuid, p_kind text default 'state') returns void
language sql
set search_path = ''
as $$
  insert into private.web_sync_outbox (business_id, product_id, payload, kind)
  select p.business_id, p.id, private.web_payload(p.id), p_kind
  from public.products p
  where p.id = p_product_id and (p.sanity_id is not null or (p_kind = 'content' and p.show_on_web and p.is_active));
$$;

-- Si un alfajor tiene algo pendiente para la web, y si ya falló 3 veces. Solo para los negocios de quien pregunta: la
-- app no lee el outbox
create function private.web_sync_pending(p_business_id uuid, p_product_id uuid) returns table (pending boolean, failing boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) > 0, coalesce(bool_or(o.attempts >= 3), false)
  from private.web_sync_outbox o
  where o.business_id = p_business_id and o.product_id = p_product_id and o.sent_at is null
    and (p_business_id = any (private.owned_business_ids()) or current_user in ('postgres', 'service_role'));
$$;

-- Un producto como lo ve la app, con lo de la web: si tiene foto, su dirección, si es «Nuevo» y cómo va la copia
create or replace function private.product_json(p_product public.products) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_product.id,
    'name', p_product.name,
    'priceCents', p_product.price_cents::integer,
    'costCents', p_product.cost_cents::integer,
    'minStock', p_product.min_stock,
    'showOnWeb', p_product.show_on_web,
    'isActive', p_product.is_active,
    'sortOrder', p_product.sort_order,
    'imageUrl', p_product.image_url,
    'linkedToWeb', p_product.sanity_id is not null,
    'description', p_product.description,
    'allergens', to_jsonb(p_product.allergens),
    'hasPhoto', p_product.photo_path is not null,
    'webSlug', p_product.web_slug,
    'isNew', coalesce(p_product.web_published_at > now() - interval '30 days', false),
    'webState', case
      when pending.failing then 'failing'
      when pending.pending then 'pending'
      when p_product.sanity_id is null and not (p_product.show_on_web and p_product.is_active) then 'none'
      when p_product.sanity_id is null and (p_product.description is null or p_product.photo_path is null) then 'incomplete'
      when p_product.sanity_id is null then 'waiting'
      when p_product.show_on_web and p_product.is_active then 'sent'
      else 'hidden'
    end,
    'version', p_product.version
  )
  from private.web_sync_pending(p_product.business_id, p_product.id) as pending;
$$;

-- Crea (sin id) o cambia (con id y la versión que la app tenía) un producto. Valida todo antes de guardar. Anota en la
-- web el contenido si cambió el nombre, la descripción o los alérgenos; el estado, si cambió el precio o si se ve
drop function public.save_product(uuid, integer, text, integer, integer, integer, boolean);
drop function private.save_product(uuid, integer, text, integer, integer, integer, boolean);
create function private.save_product(
  p_id uuid, p_expected_version integer, p_name text, p_price_cents integer, p_cost_cents integer,
  p_min_stock integer, p_show_on_web boolean, p_description text default null, p_allergens text[] default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_allergens text[] := array(select distinct a from unnest(coalesce(p_allergens, '{}')) as a order by a);
  v_before public.products%rowtype;
  v_product public.products%rowtype;
begin
  if v_name is null or length(v_name) not between 1 and 40
     or p_price_cents is null or p_price_cents not between 1 and 1000000
     or (p_cost_cents is not null and p_cost_cents not between 1 and 1000000)
     or p_min_stock is null or p_min_stock not between 0 and 9999
     or p_show_on_web is null
     or length(v_description) > 400
     or not (v_allergens <@ array['gluten', 'lacteos', 'huevo', 'pescado', 'crustaceos', 'moluscos', 'mani', 'frutos-secos',
       'soya', 'ajonjoli', 'mostaza', 'apio', 'sulfitos']::text[]) then
    perform private.fail('invalid');
  end if;

  if p_id is null then
    if p_expected_version is not null then
      perform private.fail('invalid');
    end if;
    begin
      insert into public.products (business_id, name, price_cents, cost_cents, min_stock, show_on_web, sort_order, description, allergens)
      values (
        v_business_id, v_name, p_price_cents, p_cost_cents, p_min_stock, p_show_on_web,
        coalesce((select max(p.sort_order) from public.products p where p.business_id = v_business_id), 0) + 1,
        v_description, v_allergens
      )
      returning * into v_product;
    exception when unique_violation then
      perform private.fail('conflict');
    end;
    perform private.queue_web_sync(v_product.id, 'content');
    return private.product_json(v_product);
  end if;

  select p.* into v_before from public.products p where p.id = p_id and p.business_id = v_business_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_expected_version is null then
    perform private.fail('invalid');
  end if;
  if v_before.version <> p_expected_version then
    perform private.fail('conflict');
  end if;

  begin
    update public.products p
    set name = v_name,
        price_cents = p_price_cents,
        cost_cents = p_cost_cents,
        min_stock = p_min_stock,
        show_on_web = p_show_on_web,
        description = v_description,
        allergens = v_allergens,
        version = p.version + 1
    where p.id = p_id
    returning p.* into v_product;
  exception when unique_violation then
    perform private.fail('conflict');
  end;

  if v_product.name <> v_before.name or v_product.description is distinct from v_before.description
     or v_product.allergens <> v_before.allergens then
    perform private.queue_web_sync(v_product.id, 'content');
  elsif v_product.sanity_id is null and v_product.show_on_web and not v_before.show_on_web then
    -- Prender «se ve» en uno que todavía no está en la web es lo que lo crea allá
    perform private.queue_web_sync(v_product.id, 'content');
  elsif v_product.price_cents <> v_before.price_cents or v_product.show_on_web <> v_before.show_on_web then
    perform private.queue_web_sync(v_product.id);
  end if;
  return private.product_json(v_product);
end;
$$;

create function public.save_product(
  p_id uuid, p_expected_version integer, p_name text, p_price_cents integer, p_cost_cents integer,
  p_min_stock integer, p_show_on_web boolean, p_description text default null, p_allergens text[] default null
) returns jsonb
language sql
set search_path = ''
as $$
  select private.save_product(p_id, p_expected_version, p_name, p_price_cents, p_cost_cents, p_min_stock, p_show_on_web,
    p_description, p_allergens);
$$;

-- La foto del alfajor, después de subirla a su carpeta (<negocio>/<alfajor>/<uuid>.jpg). Anota el contenido para la web
create function private.set_product_photo(p_product_id uuid, p_path text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_product public.products%rowtype;
begin
  update public.products p
  set photo_path = p_path, version = p.version + 1
  where p.id = p_product_id and p.business_id = v_business_id
  returning p.* into v_product;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_path is null or p_path !~ ('^' || v_business_id::text || '/' || p_product_id::text || '/[0-9a-f-]{36}\.jpg$') then
    perform private.fail('invalid');
  end if;
  perform private.queue_web_sync(v_product.id, 'content');
  return private.product_json(v_product);
end;
$$;

create function public.set_product_photo(p_product_id uuid, p_path text) returns jsonb
language sql
set search_path = ''
as $$
  select private.set_product_photo(p_product_id, p_path);
$$;

grant execute on function public.save_product(uuid, integer, text, integer, integer, integer, boolean, text, text[]),
  private.save_product(uuid, integer, text, integer, integer, integer, boolean, text, text[]),
  public.set_product_photo(uuid, text), private.set_product_photo(uuid, text), private.web_sync_pending(uuid, uuid)
  to authenticated;
