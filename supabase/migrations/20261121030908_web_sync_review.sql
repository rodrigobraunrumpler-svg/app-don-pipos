-- Los arreglos de la revisión final de la fase 8 (docs/plan/fase-8-entrega.md, «Después de la revisión final»). Este
-- proyecto también es el de producción: los datos reales del cliente conviven con los DEMO hasta limpiarlos.
-- 1. Solo el negocio enlazado a la web (web_sync_business_id en Vault) se copia a Sanity. Lo de otro negocio (los datos
--    DEMO) se cierra sin mandarse y no se puede enlazar.
-- 2. Una sola corrida de sync-to-web a la vez, y cada alfajor sale con su estado de ahora, no con el de la fila más nueva.
-- 3. Si llamar a la función falla, el cambio del dueño igual se guarda.
-- 4. El historial del cron (una fila por minuto) se limpia cada día: el plan gratis tiene 500 MB.
-- (pg_net es de supabase_admin y la deja abierta a todos los roles: este rol no puede cerrarla. Su esquema, net, no
-- sale por la API, y la regla 8 de 900_structure deja cerrada a la app toda función de public y private.)

-- El negocio cuyos alfajores se copian a la web. Sin él en Vault, no se copia nada
create function private.web_sync_business() returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(btrim(s.decrypted_secret), '')::uuid from vault.decrypted_secrets s where s.name = 'web_sync_business_id';
$$;

-- Un alfajor para la web, como está ahora: su precio, si hay stock y si se ve (se ve en la web y está activo)
create function private.web_payload(p_product_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'priceMinor', p.price_cents::integer,
    'isAvailable', coalesce(l.on_hand, 0) > 0,
    'isVisible', p.show_on_web and p.is_active
  )
  from public.products p
  left join public.stock_levels l on l.business_id = p.business_id and l.product_id = p.id
  where p.id = p_product_id;
$$;

create or replace function private.queue_web_sync(p_product_id uuid) returns void
language sql
set search_path = ''
as $$
  insert into private.web_sync_outbox (business_id, product_id, payload)
  select p.business_id, p.id, private.web_payload(p.id)
  from public.products p
  where p.id = p_product_id and p.sanity_id is not null;
$$;

-- Para sync-to-web: lo pendiente del negocio de la web, uno por alfajor, con su estado de ahora y todas sus filas. Una
-- corrida a la vez (candado hasta que la función termina): la otra vuelve sin nada y el cron la repite al minuto
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
  set sent_at = now(), last_error = 'not_linked'
  from public.products p
  where o.sent_at is null and o.business_id = v_business
    and p.business_id = o.business_id and p.id = o.product_id and p.sanity_id is null;

  with pending as (
    select o.id, o.product_id, o.attempts
    from private.web_sync_outbox o
    where o.sent_at is null and o.business_id = v_business
    order by o.id
    for update of o skip locked
  ), grouped as (
    select g.product_id, array_agg(g.id order by g.id) as ids, max(g.attempts) as attempts, min(g.id) as first_id
    from pending g
    group by g.product_id
    order by min(g.id)
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'ids', to_jsonb(gr.ids), 'sanityId', p.sanity_id, 'payload', private.web_payload(p.id), 'attempts', gr.attempts
    ) order by gr.first_id), '[]'::jsonb)
  into v_items
  from grouped gr
  join public.products p on p.business_id = v_business and p.id = gr.product_id;
  return v_items;
end;
$$;

-- Para el equipo: enlaza un alfajor del negocio de la web con su documento, y anota su estado completo
create or replace function private.link_product(p_product_id uuid, p_sanity_id text, p_image_url text) returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.products p
  set sanity_id = nullif(btrim(p_sanity_id), ''), image_url = coalesce(nullif(btrim(p_image_url), ''), p.image_url)
  where p.id = p_product_id and p.business_id = private.web_sync_business();
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.queue_web_sync(p_product_id);
end;
$$;

create or replace function private.web_sync_due(p_now timestamptz) returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.web_sync_outbox o
    where o.sent_at is null and o.business_id = private.web_sync_business()
      and (o.attempts < 10 or extract(minute from p_now) = 0)
  );
$$;

create or replace function private.web_sync_outbox_inserted() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  begin
    perform private.kick_web_sync();
  exception when others then
    -- Un texto fijo, porque el error podría traer la URL o el secreto. El cron lo vuelve a intentar al minuto
    raise warning 'sync-to-web: no se pudo llamar a la función';
  end;
  return null;
end;
$$;

-- Borra el historial del cron de más de 7 días (el consejo de Supabase)
create function private.purge_cron_history() returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from cron.job_run_details d where d.end_time < now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Cada día a las 08:40 UTC, que son las 03:40 de Lima
select cron.schedule('purge-cron-history', '40 8 * * *', 'select private.purge_cron_history()');

