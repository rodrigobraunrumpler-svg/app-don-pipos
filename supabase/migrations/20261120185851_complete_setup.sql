-- La puesta en marcha de la primera vez (docs/spec/businesses.md §3): el stock de hoy de cada alfajor, como un conteo
-- (lo contado menos lo que debería haber en la nevera), y los tipos de gasto elegidos. Una sola vez por negocio
create function private.complete_setup(p_request_id uuid, p_stock jsonb, p_categories jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_item record;
  v_category record;
  v_before integer;
  v_reserved integer;
  v_difference integer;
  v_next integer;
  v_adjustments integer := 0;
  v_created integer := 0;
begin
  if p_stock is null or jsonb_typeof(p_stock) <> 'array' or jsonb_array_length(p_stock) > 50
     or p_categories is null or jsonb_typeof(p_categories) <> 'array' or jsonb_array_length(p_categories) > 20 then
    perform private.fail('invalid');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_categories) as e (item)
    where jsonb_typeof(e.item) <> 'object'
      or e.item - 'name' - 'icon' <> '{}'::jsonb
      or jsonb_typeof(e.item -> 'name') is distinct from 'string'
      or jsonb_typeof(e.item -> 'icon') is distinct from 'string'
      or length(btrim(e.item ->> 'name')) not between 1 and 40
      or (e.item ->> 'icon') !~ '^[a-z0-9-]{1,40}$'
  ) then
    perform private.fail('invalid');
  end if;

  v_saved := private.claim_request(v_business_id, p_request_id, 'complete_setup', md5(p_stock::text || p_categories::text));
  if v_saved is not null then
    return v_saved;
  end if;

  -- El negocio bloqueado: dos celulares a la vez no la hacen dos veces
  perform 1 from public.businesses b where b.id = v_business_id and b.setup_done_at is null for update;
  if not found then
    perform private.fail('conflict');
  end if;

  if jsonb_array_length(p_stock) > 0 then
    for v_item in select * from private.stock_items(v_business_id, p_stock, 'counted', 0, 100000) loop
      insert into public.stock_levels (business_id, product_id) values (v_business_id, v_item.product_id)
      on conflict (business_id, product_id) do nothing;
      select l.on_hand into v_before
      from public.stock_levels l where l.business_id = v_business_id and l.product_id = v_item.product_id
      for update;
      select coalesce(sum(r.reserved), 0)::integer into v_reserved
      from private.reserved_stock(v_business_id) as r where r.product_id = v_item.product_id;
      v_difference := v_item.amount - (v_before + v_reserved);
      if v_difference <> 0 then
        perform private.move_stock(v_business_id, v_item.product_id, 'adjustment', v_difference, 'initial', p_request_id, null);
        v_adjustments := v_adjustments + 1;
      end if;
    end loop;
  end if;

  -- Los tipos en el orden en que llegan, después de los que ya hay. Un nombre repetido o que ya existe (sin mirar
  -- mayúsculas) no se crea otra vez
  select coalesce(max(c.sort_order), 0) into v_next from public.expense_categories c where c.business_id = v_business_id;
  for v_category in
    select x.name, x.icon from (
      select distinct on (lower(btrim(e.item ->> 'name'))) btrim(e.item ->> 'name') as name, e.item ->> 'icon' as icon, e.position
      from jsonb_array_elements(p_categories) with ordinality as e (item, position)
      order by lower(btrim(e.item ->> 'name')), e.position
    ) x
    where not exists (
      select 1 from public.expense_categories c where c.business_id = v_business_id and lower(c.name) = lower(x.name)
    )
    order by x.position
  loop
    v_next := v_next + 1;
    insert into public.expense_categories (business_id, name, icon, sort_order)
    values (v_business_id, v_category.name, v_category.icon, v_next);
    v_created := v_created + 1;
  end loop;

  update public.businesses b set setup_done_at = now() where b.id = v_business_id;

  return private.complete_request(v_business_id, p_request_id,
    jsonb_build_object('adjustments', v_adjustments, 'categories', v_created));
end;
$$;

create function public.complete_setup(p_request_id uuid, p_stock jsonb, p_categories jsonb) returns jsonb
language sql
set search_path = ''
as $$
  select private.complete_setup(p_request_id, p_stock, p_categories);
$$;

grant execute on function public.complete_setup(uuid, jsonb, jsonb), private.complete_setup(uuid, jsonb, jsonb) to authenticated;
