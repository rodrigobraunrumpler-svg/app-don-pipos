-- Leer el negocio y cambiar sus ajustes.
-- Las funciones reciben y devuelven JSON con los nombres del código (camelCase), como manda el glosario.

-- Un entero dentro de un JSON, entre dos límites. Cualquier otra cosa es invalid.
create function private.json_integer(p_value jsonb, p_min integer, p_max integer) returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_number numeric;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'number' then
    perform private.fail('invalid');
  end if;
  v_number := (p_value #>> '{}')::numeric;
  if v_number <> trunc(v_number) or v_number < p_min or v_number > p_max then
    perform private.fail('invalid');
  end if;
  return v_number::integer;
end;
$$;

-- Los ajustes tal como los ve la app
create function private.settings_json(p_settings public.business_settings) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'activePaymentMethods', to_jsonb(p_settings.active_payment_methods),
    'deliveryFeeCents', p_settings.delivery_fee_cents::integer,
    'deliveryZone', p_settings.delivery_zone,
    'productionIntervalDays', p_settings.production_interval_days,
    'lapsedAfterDays', p_settings.lapsed_after_days,
    'reminders', p_settings.reminders,
    'version', p_settings.version
  );
$$;

-- El negocio del usuario con sus ajustes. Lee con las reglas de acceso: solo ve lo suyo.
create function public.get_business() returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
  v_settings public.business_settings%rowtype;
begin
  select b.* into v_business from public.businesses b order by b.created_at, b.id limit 1;
  if not found then
    perform private.fail('not_found');
  end if;
  select s.* into v_settings from public.business_settings s where s.business_id = v_business.id;

  return jsonb_build_object(
    'id', v_business.id,
    'name', v_business.name,
    'modules', to_jsonb(v_business.modules),
    'setupDone', v_business.setup_done_at is not null,
    'settings', private.settings_json(v_settings)
  );
end;
$$;

-- Cambia uno o varios ajustes del negocio del usuario. Valida todo antes de guardar y guarda una sola vez.
create function public.update_settings(p_expected_version integer, p_patch jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_settings public.business_settings%rowtype;
  v_value jsonb;
  v_zone text;
begin
  select s.* into v_settings from public.business_settings s where s.business_id = v_business_id for update;

  if p_expected_version is null then
    perform private.fail('invalid');
  end if;
  if v_settings.version <> p_expected_version then
    perform private.fail('conflict');
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    perform private.fail('invalid');
  end if;
  if p_patch - array['activePaymentMethods', 'deliveryFeeCents', 'deliveryZone', 'productionIntervalDays', 'lapsedAfterDays', 'reminders']
     <> '{}'::jsonb then
    perform private.fail('invalid');
  end if;

  if p_patch ? 'activePaymentMethods' then
    v_value := p_patch -> 'activePaymentMethods';
    if jsonb_typeof(v_value) <> 'array' then
      perform private.fail('invalid');
    end if;
    if jsonb_array_length(v_value) not between 1 and 4
       or exists (
         select 1 from jsonb_array_elements(v_value) as e(method)
         where jsonb_typeof(e.method) <> 'string' or (e.method #>> '{}') not in ('cash', 'yape', 'plin', 'transfer')
       )
       or (select count(distinct e.method) from jsonb_array_elements(v_value) as e(method)) <> jsonb_array_length(v_value) then
      perform private.fail('invalid');
    end if;
    v_settings.active_payment_methods := array(
      select (e.method #>> '{}')::public.payment_method
      from jsonb_array_elements(v_value) with ordinality as e(method, position)
      order by e.position
    );
  end if;

  if p_patch ? 'deliveryFeeCents' then
    v_settings.delivery_fee_cents := private.json_integer(p_patch -> 'deliveryFeeCents', 0, 1000000);
  end if;
  if p_patch ? 'productionIntervalDays' then
    v_settings.production_interval_days := private.json_integer(p_patch -> 'productionIntervalDays', 1, 14);
  end if;
  if p_patch ? 'lapsedAfterDays' then
    v_settings.lapsed_after_days := private.json_integer(p_patch -> 'lapsedAfterDays', 7, 120);
  end if;

  if p_patch ? 'deliveryZone' then
    v_value := p_patch -> 'deliveryZone';
    if jsonb_typeof(v_value) not in ('string', 'null') then
      perform private.fail('invalid');
    end if;
    v_zone := nullif(btrim(v_value #>> '{}'), '');
    if length(v_zone) > 120 then
      perform private.fail('invalid');
    end if;
    v_settings.delivery_zone := v_zone;
  end if;

  if p_patch ? 'reminders' then
    v_value := p_patch -> 'reminders';
    if jsonb_typeof(v_value) <> 'object' then
      perform private.fail('invalid');
    end if;
    if not (v_value ?& array['scheduled', 'stock', 'balances'])
       or v_value - 'scheduled' - 'stock' - 'balances' <> '{}'::jsonb
       or jsonb_typeof(v_value -> 'scheduled') <> 'boolean'
       or jsonb_typeof(v_value -> 'stock') <> 'boolean'
       or jsonb_typeof(v_value -> 'balances') <> 'boolean' then
      perform private.fail('invalid');
    end if;
    v_settings.reminders := v_value;
  end if;

  update public.business_settings s
  set active_payment_methods = v_settings.active_payment_methods,
      delivery_fee_cents = v_settings.delivery_fee_cents,
      delivery_zone = v_settings.delivery_zone,
      production_interval_days = v_settings.production_interval_days,
      lapsed_after_days = v_settings.lapsed_after_days,
      reminders = v_settings.reminders,
      version = s.version + 1
  where s.business_id = v_business_id
  returning s.* into v_settings;

  return private.settings_json(v_settings);
end;
$$;

-- La app ejecuta estas dos. get_business corre con el rol del usuario, así que también necesita
-- las dos funciones internas que usa: una solo avisa errores y la otra solo da forma a un JSON.
grant execute on function public.get_business() to authenticated;
grant execute on function public.update_settings(integer, jsonb) to authenticated;
grant execute on function private.fail(text) to authenticated;
grant execute on function private.settings_json(public.business_settings) to authenticated;
