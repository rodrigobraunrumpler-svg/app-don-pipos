-- Los mensajes de WhatsApp: cambiarlos y volver al texto original (docs/spec/messages.md §3). Cada cambio queda en el
-- registro: el disparador audit_changes sobre body ya existe

-- Los marcadores que vale cada plantilla, con el mismo criterio que la app (messages/rules/placeholders.ts)
create function private.template_placeholders(p_key text) returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_key
    when 'confirmation' then array['nombre', 'numero', 'detalle', 'total', 'adelanto', 'entrega']
    when 'on_the_way' then array['nombre', 'numero', 'pago', 'falta']
    when 'ready' then array['nombre', 'numero', 'pago', 'falta']
    when 'delivered' then array['nombre', 'sellos']
    when 'balance_reminder' then array['nombre', 'numero', 'falta']
    when 'we_miss_you' then array['nombre']
  end;
$$;

-- Un texto como lo ve la app, con si es el original
create function private.template_json(p_template public.message_templates) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'key', p_template.key,
    'body', p_template.body,
    'version', p_template.version,
    'isDefault', p_template.body = (select d.body from private.default_templates() d where d.key = p_template.key)
  );
$$;

-- Cambiar un texto: de 1 a 500 caracteres y solo con los marcadores de su plantilla; si no, invalid. Con otra versión,
-- conflict
create function private.update_template(p_key text, p_expected_version integer, p_body text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_template public.message_templates%rowtype;
  v_body text := btrim(p_body);
  v_allowed text[] := private.template_placeholders(p_key);
begin
  if v_allowed is null or coalesce(length(v_body), 0) not between 1 and 500 or exists (
    select 1 from regexp_matches(v_body, '\{(\w+)\}', 'g') as m where not (m[1] = any (v_allowed))
  ) then
    perform private.fail('invalid');
  end if;
  select t.* into v_template from public.message_templates t
  where t.business_id = v_business_id and t.key = p_key for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_template.version is distinct from p_expected_version then
    perform private.fail('conflict');
  end if;
  update public.message_templates t set body = v_body, version = t.version + 1
  where t.business_id = v_business_id and t.key = p_key
  returning t.* into v_template;
  return private.template_json(v_template);
end;
$$;

-- Volver al texto original. Si ya lo es, queda como está
create function private.reset_template(p_key text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_template public.message_templates%rowtype;
  v_default text := (select d.body from private.default_templates() d where d.key = p_key);
begin
  if v_default is null then
    perform private.fail('invalid');
  end if;
  select t.* into v_template from public.message_templates t
  where t.business_id = v_business_id and t.key = p_key for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_template.body <> v_default then
    update public.message_templates t set body = v_default, version = t.version + 1
    where t.business_id = v_business_id and t.key = p_key
    returning t.* into v_template;
  end if;
  return private.template_json(v_template);
end;
$$;

create function public.update_template(p_key text, p_expected_version integer, p_body text) returns jsonb
language sql
set search_path = ''
as $$
  select private.update_template(p_key, p_expected_version, p_body);
$$;

create function public.reset_template(p_key text) returns jsonb
language sql
set search_path = ''
as $$
  select private.reset_template(p_key);
$$;

-- Los textos del negocio, con si son el original
create or replace function public.list_templates() returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(private.template_json(t) order by t.key), '[]'::jsonb)
  from public.message_templates t
  where t.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1);
$$;

grant execute on function public.update_template(text, integer, text), public.reset_template(text),
  private.update_template(text, integer, text), private.reset_template(text),
  private.template_json(public.message_templates) to authenticated;
-- list_templates (con las reglas de acceso de quien lee) compara con los textos originales
grant execute on function private.default_templates() to authenticated;
