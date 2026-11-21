-- Fase 9, después de la revisión final (docs/plan/fase-9-alfajores-web.md):
-- 1. Al enlazar un alfajor recién creado en la web se vuelve a anotar su estado: lo que cambió mientras se creaba
--    («Deshacer», un precio, el stock) sale con el estado de ahora.
-- 2. Si la página que encontró la copia ya es de otro alfajor, no se enlaza y sus filas vuelven como fallidas: la corrida
--    sigue con los demás en vez de cortarse (y repetirse cada minuto).
-- 3. Un cambio de estado de uno enlazado no toca su fila: la copia no la bloquea mientras sube las fotos de otros.
-- 4. Dos alfajores no comparten nombre en la web: «Alfajor Coqueta» y «Coqueta» serían la misma página.
-- 5. La foto que sube la app no cambia la versión: no choca con guardar justo después ni con «Deshacer».

create unique index products_business_web_name on public.products (business_id, lower(private.web_name(name)));

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

  -- Solo si cambió algo del alfajor en la web: su documento, su dirección o su foto
  if p_error is not null or not coalesce(p_result ?| array['sanityId', 'slug', 'imageUrl', 'photoPath'], false) then
    return;
  end if;

  select p.sanity_id is not null into v_was_linked from public.products p where p.id = v_product for update;
  begin
    update public.products p
    set web_published_at = case when p.sanity_id is null and p_result ? 'sanityId' then now() else p.web_published_at end,
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

create or replace function private.set_product_photo(p_product_id uuid, p_path text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_product public.products%rowtype;
begin
  update public.products p
  set photo_path = p_path
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
