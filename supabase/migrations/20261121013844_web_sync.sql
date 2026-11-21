-- La copia a la web (docs/spec/products.md §3, fase 8). La Edge Function sync-to-web toma del outbox lo más nuevo de cada
-- producto, lo manda a Sanity (un pedido por producto) y anota lo enviado o el error. La base la llama con pg_net: al
-- momento, con un trigger del outbox, y cada minuto con pg_cron mientras quede algo pendiente. La URL y el secreto de la
-- función viven en Vault (web_sync_url, web_sync_secret): sin ellos no se llama a nada
create extension if not exists pg_net;

-- Para sync-to-web: lo pendiente, uno por producto, con el estado más nuevo y todas sus filas. Bloquea esas filas hasta
-- que la función termina (skip locked: dos llamadas a la vez no mandan lo mismo). Las filas de un producto que ya no
-- está enlazado se cierran sin mandar nada
create function private.claim_web_sync(p_limit integer default 20) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  update private.web_sync_outbox o
  set sent_at = now(), last_error = 'not_linked'
  from public.products p
  where o.sent_at is null and p.business_id = o.business_id and p.id = o.product_id and p.sanity_id is null;

  with pending as (
    select o.id, o.business_id, o.product_id, o.payload, o.attempts
    from private.web_sync_outbox o
    where o.sent_at is null
    order by o.id
    for update of o skip locked
  ), grouped as (
    select g.business_id, g.product_id, array_agg(g.id order by g.id) as ids,
      (array_agg(g.payload order by g.id desc))[1] as payload, max(g.attempts) as attempts, min(g.id) as first_id
    from pending g
    group by g.business_id, g.product_id
    order by min(g.id)
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'ids', to_jsonb(gr.ids), 'sanityId', p.sanity_id, 'payload', gr.payload, 'attempts', gr.attempts
    ) order by gr.first_id), '[]'::jsonb)
  into v_items
  from grouped gr
  join public.products p on p.business_id = gr.business_id and p.id = gr.product_id;
  return v_items;
end;
$$;

-- Para sync-to-web: lo que pasó con unas filas. Sin error, quedan enviadas; con error, suman un intento y lo guardan
create function private.finish_web_sync(p_ids bigint[], p_error text) returns void
language sql
set search_path = ''
as $$
  update private.web_sync_outbox o
  set sent_at = case when p_error is null then now() end,
      attempts = o.attempts + case when p_error is null then 0 else 1 end,
      last_error = left(p_error, 500)
  where o.id = any(p_ids);
$$;

-- Para el equipo (al enlazar un alfajor con su documento de la web): el enlace, la foto y su estado completo al outbox
create function private.link_product(p_product_id uuid, p_sanity_id text, p_image_url text) returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.products p
  set sanity_id = nullif(btrim(p_sanity_id), ''), image_url = coalesce(nullif(btrim(p_image_url), ''), p.image_url)
  where p.id = p_product_id;
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.queue_web_sync(p_product_id);
end;
$$;

-- Si toca llamar a la función: algo pendiente con menos de 10 intentos, cada vez; con 10 o más (un documento que no
-- existe, un token vencido), solo a la hora en punto, para no insistir cada minuto
create function private.web_sync_due(p_now timestamptz) returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from private.web_sync_outbox o
    where o.sent_at is null and (o.attempts < 10 or extract(minute from p_now) = 0)
  );
$$;

-- Llama a sync-to-web por pg_net, una vez por transacción, si toca y si están sus secretos en Vault
create function private.kick_web_sync() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if current_setting('app.web_sync_kicked', true) = 'on' or not private.web_sync_due(now()) then
    return;
  end if;
  select s.decrypted_secret into v_url from vault.decrypted_secrets s where s.name = 'web_sync_url';
  select s.decrypted_secret into v_secret from vault.decrypted_secrets s where s.name = 'web_sync_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform set_config('app.web_sync_kicked', 'on', true);
  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-web-sync-secret', v_secret),
    timeout_milliseconds := 30000
  );
end;
$$;

create function private.web_sync_outbox_inserted() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.kick_web_sync();
  return null;
end;
$$;

create trigger web_sync_kick after insert on private.web_sync_outbox
  for each statement execute function private.web_sync_outbox_inserted();

-- Cada minuto, lo que quedó pendiente (un error de Sanity, o la señal que no llegó)
select cron.schedule('web-sync-retry', '* * * * *', 'select private.kick_web_sync()');
