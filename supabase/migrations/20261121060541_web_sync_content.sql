-- Fase 9 (docs/plan/fase-9-alfajores-web.md): la copia crea en Sanity la página de un alfajor que todavía no está, con su
-- foto, y manda su contenido (nombre, descripción, alérgenos, foto) solo cuando cambia en la app. Su estado (precio,
-- stock, si se ve, orden y «Nuevo») va siempre

-- El nombre en la web: «Alfajor Coqueta» (si ya empieza con «Alfajor», tal cual)
create function private.web_name(p_name text) returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_name ~* '^alfajor\s' then p_name else 'Alfajor ' || p_name end;
$$;

-- El estado de un alfajor en la web, como está ahora
create function private.web_state(p_product_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'priceMinor', p.price_cents::integer,
    'isAvailable', coalesce(l.on_hand, 0) > 0,
    'isVisible', p.show_on_web and p.is_active,
    'sortOrder', p.sort_order * 10,
    'isNew', coalesce(p.web_published_at > now() - interval '30 days', false)
  )
  from public.products p
  left join public.stock_levels l on l.business_id = p.business_id and l.product_id = p.id
  where p.id = p_product_id;
$$;

-- Su contenido para la web. La descripción va solo si la app tiene una: la de un alfajor que nació en el panel no se pisa
create function private.web_content(p_product_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'name', private.web_name(p.name),
    'description', p.description,
    'allergens', to_jsonb(p.allergens),
    'photoPath', p.photo_path,
    'photoChanged', p.photo_path is not null and p.photo_path is distinct from p.web_photo_path,
    'alt', private.web_name(p.name) || ' de Don Pipos'
  ))
  from public.products p
  where p.id = p_product_id;
$$;

-- Para sync-to-web: lo pendiente del negocio de la web, uno por alfajor. Una corrida a la vez (el candado dura hasta que
-- la función termina). Un alfajor que todavía no está en la web se crea si se ve y tiene foto y descripción; si no, sus
-- filas se cierran (not_on_web, incomplete) y vuelven con el próximo cambio de contenido
create or replace function private.claim_web_sync(p_limit integer default 20) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_business uuid := private.web_sync_business();
  v_items jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('sync-to-web')) or v_business is null then
    return '[]'::jsonb;
  end if;

  update private.web_sync_outbox o
  set sent_at = now(), last_error = 'not_live_business'
  where o.sent_at is null and o.business_id <> v_business;

  update private.web_sync_outbox o
  set sent_at = now(), last_error = case when p.show_on_web and p.is_active then 'incomplete' else 'not_on_web' end
  from public.products p
  where o.sent_at is null and o.business_id = v_business
    and p.business_id = o.business_id and p.id = o.product_id and p.sanity_id is null
    and not (p.show_on_web and p.is_active and p.description is not null and p.photo_path is not null);

  with pending as (
    select o.id, o.product_id, o.attempts, o.kind
    from private.web_sync_outbox o
    where o.sent_at is null and o.business_id = v_business
    order by o.id
    for update of o skip locked
  ), grouped as (
    select g.product_id, array_agg(g.id order by g.id) as ids, max(g.attempts) as attempts,
      bool_or(g.kind = 'content') as content, min(g.id) as first_id
    from pending g
    group by g.product_id
    order by min(g.id)
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'ids', to_jsonb(gr.ids),
      'productId', p.id,
      'sanityId', p.sanity_id,
      'slug', p.web_slug,
      'attempts', gr.attempts,
      'payload', private.web_state(p.id),
      'content', case when gr.content or p.sanity_id is null then private.web_content(p.id) end
    ) order by gr.first_id), '[]'::jsonb)
  into v_items
  from grouped gr
  join public.products p on p.business_id = v_business and p.id = gr.product_id;
  return v_items;
end;
$$;

-- Para sync-to-web: lo que pasó con unas filas. Sin error quedan enviadas y, con un resultado, el alfajor guarda su
-- documento, su dirección, la foto que ya está en la web y, si recién se creó allá, desde cuándo sale («Nuevo»)
drop function private.finish_web_sync(bigint[], text);
create function private.finish_web_sync(p_ids bigint[], p_error text, p_result jsonb default null) returns void
language plpgsql
set search_path = ''
as $$
begin
  update private.web_sync_outbox o
  set sent_at = case when p_error is null then now() end,
      attempts = o.attempts + case when p_error is null then 0 else 1 end,
      last_error = left(p_error, 500)
  where o.id = any(p_ids) and o.sent_at is null;

  if p_error is null and p_result ? 'productId' then
    update public.products p
    set web_published_at = case when p.sanity_id is null and p_result ? 'sanityId' then now() else p.web_published_at end,
        sanity_id = coalesce(p_result ->> 'sanityId', p.sanity_id),
        web_slug = coalesce(p_result ->> 'slug', p.web_slug),
        image_url = coalesce(p_result ->> 'imageUrl', p.image_url),
        web_photo_path = coalesce(p_result ->> 'photoPath', p.web_photo_path)
    where p.id = (p_result ->> 'productId')::uuid;
  end if;
end;
$$;

-- Para el equipo: enlaza un alfajor del negocio de la web con su documento (y su dirección), y anota su estado completo
drop function private.link_product(uuid, text, text);
create function private.link_product(p_product_id uuid, p_sanity_id text, p_image_url text, p_slug text default null) returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.products p
  set sanity_id = nullif(btrim(p_sanity_id), ''), image_url = coalesce(nullif(btrim(p_image_url), ''), p.image_url),
      web_slug = coalesce(nullif(btrim(p_slug), ''), p.web_slug)
  where p.id = p_product_id and p.business_id = private.web_sync_business();
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.queue_web_sync(p_product_id);
end;
$$;
