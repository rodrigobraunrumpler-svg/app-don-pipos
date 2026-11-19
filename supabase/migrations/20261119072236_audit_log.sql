-- Registro de cambios delicados: quién cambió qué, con el valor de antes y el de después.
-- Sirve para responder «¿cuándo subí el precio?». En esta versión no tiene pantalla.

create table private.audit_log (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id),
  table_name text not null,
  row_id uuid not null,
  action text not null constraint audit_log_action_known check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

-- Lo último que cambió en un negocio
create index audit_log_business_id_changed_at_idx on private.audit_log (business_id, changed_at desc);

alter table private.audit_log enable row level security;

-- Trigger genérico. Recibe como argumentos las columnas que vigila y guarda solo las que cambiaron.
create function private.audit_changes() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_old_data jsonb := '{}'::jsonb;
  v_new_data jsonb := '{}'::jsonb;
  v_column text;
begin
  if tg_op <> 'UPDATE' then
    raise exception 'audit_changes solo vigila update' using errcode = 'XX000';
  end if;

  foreach v_column in array tg_argv loop
    if (v_old -> v_column) is distinct from (v_new -> v_column) then
      v_old_data := v_old_data || jsonb_build_object(v_column, v_old -> v_column);
      v_new_data := v_new_data || jsonb_build_object(v_column, v_new -> v_column);
    end if;
  end loop;

  if v_new_data <> '{}'::jsonb then
    insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
    values (
      coalesce(v_new ->> 'business_id', v_new ->> 'id')::uuid,
      tg_table_name,
      coalesce(v_new ->> 'id', v_new ->> 'business_id')::uuid,
      'update',
      v_old_data,
      v_new_data,
      auth.uid()
    );
  end if;
  return null;
end;
$$;

create trigger audit_changes after update on public.business_settings
  for each row execute function private.audit_changes(
    'active_payment_methods', 'delivery_fee_cents', 'delivery_zone', 'production_interval_days', 'lapsed_after_days', 'reminders'
  );
