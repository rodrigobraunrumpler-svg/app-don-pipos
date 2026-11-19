-- Las funciones de productos (docs/spec/products.md §3). Leen con las reglas de acceso; escriben con la lógica en private.

-- Un producto como lo ve la app. El sanity_id no sale: a la app le basta saber si está enlazado a la web
create function private.product_json(p_product public.products) returns jsonb
language sql
immutable
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
    'version', p_product.version
  );
$$;

-- Anota en el outbox el estado del producto para la web: precio, si está disponible (stock > 0) y si se ve
-- (se ve en la web y está activo). Solo si está enlazado. La llaman las funciones que escriben, después de cambiar
create function private.queue_web_sync(p_product_id uuid) returns void
language sql
set search_path = ''
as $$
  insert into private.web_sync_outbox (business_id, product_id, payload)
  select p.business_id, p.id, jsonb_build_object(
    'priceMinor', p.price_cents::integer,
    'isAvailable', coalesce(l.on_hand, 0) > 0,
    'isVisible', p.show_on_web and p.is_active
  )
  from public.products p
  left join public.stock_levels l on l.business_id = p.business_id and l.product_id = p.id
  where p.id = p_product_id and p.sanity_id is not null;
$$;

-- Los productos activos del negocio, en su orden. Lee con las reglas de acceso y elige el negocio como get_business
create function public.list_products() returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.product_json(p) order by p.sort_order, lower(p.name), p.id), '[]'::jsonb)
  from public.products p
  where p.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1) and p.is_active;
$$;

-- Crea (sin id) o cambia (con id y la versión que la app tenía) un producto. Valida todo antes de guardar
create function private.save_product(
  p_id uuid, p_expected_version integer, p_name text, p_price_cents integer, p_cost_cents integer,
  p_min_stock integer, p_show_on_web boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_name text := btrim(p_name);
  v_before public.products%rowtype;
  v_product public.products%rowtype;
begin
  if v_name is null or length(v_name) not between 1 and 40
     or p_price_cents is null or p_price_cents not between 1 and 1000000
     or (p_cost_cents is not null and p_cost_cents not between 1 and 1000000)
     or p_min_stock is null or p_min_stock not between 0 and 9999
     or p_show_on_web is null then
    perform private.fail('invalid');
  end if;

  if p_id is null then
    if p_expected_version is not null then
      perform private.fail('invalid');
    end if;
    begin
      insert into public.products (business_id, name, price_cents, cost_cents, min_stock, show_on_web, sort_order)
      values (
        v_business_id, v_name, p_price_cents, p_cost_cents, p_min_stock, p_show_on_web,
        coalesce((select max(p.sort_order) from public.products p where p.business_id = v_business_id), 0) + 1
      )
      returning * into v_product;
    exception when unique_violation then
      perform private.fail('conflict');
    end;
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
        version = p.version + 1
    where p.id = p_id
    returning p.* into v_product;
  exception when unique_violation then
    perform private.fail('conflict');
  end;

  if v_product.price_cents <> v_before.price_cents or v_product.show_on_web <> v_before.show_on_web then
    perform private.queue_web_sync(v_product.id);
  end if;
  return private.product_json(v_product);
end;
$$;

-- Un producto no se borra: se desactiva. En la web, desactivado se oculta; activado vuelve a su «se ve en la web»
create function private.set_product_active(p_id uuid, p_active boolean) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_product public.products%rowtype;
begin
  if p_active is null then
    perform private.fail('invalid');
  end if;

  update public.products p
  set is_active = p_active, version = p.version + 1
  where p.id = p_id and p.business_id = v_business_id
  returning p.* into v_product;
  if not found then
    perform private.fail('not_found');
  end if;

  perform private.queue_web_sync(v_product.id);
  return private.product_json(v_product);
end;
$$;

create function public.save_product(
  p_id uuid, p_expected_version integer, p_name text, p_price_cents integer, p_cost_cents integer,
  p_min_stock integer, p_show_on_web boolean
) returns jsonb
language sql
set search_path = ''
as $$
  select private.save_product(p_id, p_expected_version, p_name, p_price_cents, p_cost_cents, p_min_stock, p_show_on_web);
$$;

create function public.set_product_active(p_id uuid, p_active boolean) returns jsonb
language sql
set search_path = ''
as $$
  select private.set_product_active(p_id, p_active);
$$;

-- La app ejecuta las tres públicas. Como corren con su rol, también necesita las privadas que llaman:
-- las dos que escriben y la que da forma al producto
grant execute on function public.list_products() to authenticated;
grant execute on function public.save_product(uuid, integer, text, integer, integer, integer, boolean) to authenticated;
grant execute on function public.set_product_active(uuid, boolean) to authenticated;
grant execute on function private.save_product(uuid, integer, text, integer, integer, integer, boolean) to authenticated;
grant execute on function private.set_product_active(uuid, boolean) to authenticated;
grant execute on function private.product_json(public.products) to authenticated;
