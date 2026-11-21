-- Fase 9, los detalles de la revisión final (docs/plan/fase-9-alfajores-web.md):
-- 1. «Nuevo» solo si la app creó la página (la función lo dice con isNew): enlazar un alfajor a una página que ya existía
--    no lo vuelve nuevo, y queda como uno del panel (conserva su nombre de allá).
-- 2. Guardar sin la descripción o sin los alérgenos (null) los deja como están; vacíos a propósito ('' y '{}'), los borra.
--    Un llamado viejo o incompleto ya no los pierde.
-- 3. Lo pendiente de otro negocio no se ve: la revisión mira el usuario de la app (su token), no current_user, que dentro
--    de una función security definer siempre es el dueño de la base.
-- 4. El registro de cambios anota los ajustes nuevos (los más vendidos, el enlace de reseñas) y la descripción y los
--    alérgenos de cada alfajor.

create or replace function private.finish_web_sync(p_ids bigint[], p_error text, p_result jsonb default null) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_product uuid := (p_result ->> 'productId')::uuid;
  v_was_linked boolean;
begin
  update private.web_sync_outbox o
  set sent_at = case when p_error is null then now() end,
      attempts = o.attempts + case when p_error is null then 0 else 1 end,
      last_error = left(p_error, 500)
  where o.id = any(p_ids) and o.sent_at is null;

  if p_error is not null or not coalesce(p_result ?| array['sanityId', 'slug', 'imageUrl', 'photoPath'], false) then
    return;
  end if;

  select p.sanity_id is not null into v_was_linked from public.products p where p.id = v_product for update;
  begin
    update public.products p
    set web_published_at = case when p.sanity_id is null and p_result ? 'isNew' then now() else p.web_published_at end,
        sanity_id = coalesce(p_result ->> 'sanityId', p.sanity_id),
        web_slug = coalesce(p_result ->> 'slug', p.web_slug),
        image_url = coalesce(p_result ->> 'imageUrl', p.image_url),
        web_photo_path = coalesce(p_result ->> 'photoPath', p.web_photo_path)
    where p.id = v_product;
  exception when unique_violation or check_violation then
    update private.web_sync_outbox o
    set sent_at = null, attempts = o.attempts + 1, last_error = left('not_linked: ' || sqlerrm, 500)
    where o.id = any(p_ids);
    return;
  end;

  if not v_was_linked and p_result ? 'sanityId' then
    perform private.queue_web_sync(v_product);
  end if;
end;
$$;

-- Crea o cambia un producto (como antes), salvo la descripción y los alérgenos que no se mandan
create or replace function private.save_product(
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
        description = case when p_description is null then v_before.description else v_description end,
        allergens = case when p_allergens is null then v_before.allergens else v_allergens end,
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

create or replace function private.web_sync_pending(p_business_id uuid, p_product_id uuid) returns table (pending boolean, failing boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) > 0, coalesce(bool_or(o.attempts >= 3), false)
  from private.web_sync_outbox o
  where o.business_id = p_business_id and o.product_id = p_product_id and o.sent_at is null
    and (p_business_id = any (private.owned_business_ids())
      or coalesce(auth.jwt() ->> 'role', '') not in ('anon', 'authenticated'));
$$;

drop trigger audit_changes on public.business_settings;
create trigger audit_changes after update on public.business_settings
  for each row execute function private.audit_changes(
    'active_payment_methods', 'delivery_fee_cents', 'delivery_zone', 'production_interval_days', 'lapsed_after_days', 'reminders',
    'products_by_sales', 'review_url'
  );

drop trigger audit_changes on public.products;
create trigger audit_changes after update on public.products
  for each row execute function private.audit_changes('price_cents', 'show_on_web', 'name', 'description', 'allergens');
