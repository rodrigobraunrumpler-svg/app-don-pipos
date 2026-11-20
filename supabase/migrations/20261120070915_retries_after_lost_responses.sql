-- Reintentos con mala señal (revisión final de la fase 5): anular o deshacer otra vez, después de una respuesta que se
-- perdió, devuelve cómo quedó en vez de un error. El cambio ya estaba hecho, y el error hacía pensar que no.

-- Anula un gasto: deja de contar en todos los totales. Anularlo otra vez (un reintento) devuelve cómo quedó
create or replace function private.void_expense(p_id uuid, p_reason text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_reason text := btrim(p_reason);
  v_expense public.expenses%rowtype;
begin
  if v_reason is null or length(v_reason) not between 1 and 120 then
    perform private.fail('invalid');
  end if;
  select e.* into v_expense from public.expenses e where e.business_id = v_business_id and e.id = p_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_expense.voided_at is not null then
    -- Ya lo anuló una anulación: es un reintento (la respuesta se perdió) y devuelve cómo quedó. Anulado por una
    -- corrección, no se anula
    if (
      select a.old_data ->> 'kind' from private.audit_log a
      where a.business_id = v_business_id and a.table_name = 'expenses' and a.row_id = p_id
      order by a.changed_at desc, a.id desc limit 1
    ) = 'void' then
      return private.expense_json(p_id);
    end if;
    perform private.fail('invalid');
  end if;

  update public.expenses e set voided_at = now(), void_reason = v_reason where e.id = p_id;
  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'expenses', p_id, 'update', jsonb_build_object('kind', 'void'),
    jsonb_build_object('voidReason', v_reason), (select auth.uid()));
  return private.expense_json(p_id);
end;
$$;

-- El «Deshacer» de corregir o anular, dentro de los 10 minutos y solo si es lo último que le pasó a ese gasto:
-- una anulación se quita; una corrección (se pasa el gasto nuevo) anula el nuevo y deja vivo el de antes.
-- Si ya no se puede, conflict (expenses.md §8)
create or replace function private.revert_expense_change(p_expense_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_expense public.expenses%rowtype;
  v_old public.expenses%rowtype;
  v_last private.audit_log%rowtype;
begin
  select e.* into v_expense from public.expenses e where e.business_id = v_business_id and e.id = p_expense_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  select a.* into v_last from private.audit_log a
  where a.business_id = v_business_id and a.table_name = 'expenses' and a.row_id = p_expense_id
  order by a.changed_at desc, a.id desc limit 1;
  if v_last.id is null or v_last.changed_at < now() - interval '10 minutes' then
    perform private.fail('conflict');
  end if;

  if v_last.old_data ->> 'kind' = 'void' and v_expense.voided_at is not null then
    update public.expenses e set voided_at = null, void_reason = null where e.id = p_expense_id;
    insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
    values (v_business_id, 'expenses', p_expense_id, 'update', jsonb_build_object('kind', 'revert_void'), null,
      (select auth.uid()));
    return private.expense_json(p_expense_id);
  end if;

  if v_last.old_data ->> 'kind' = 'correct' and v_expense.voided_at is null then
    select e.* into v_old from public.expenses e where e.business_id = v_business_id and e.id = v_expense.replaces_id for update;
    if v_old.voided_at is not null then
      update public.expenses e set voided_at = now(), void_reason = 'deshacer corrección' where e.id = p_expense_id;
      update public.expenses e set voided_at = null, void_reason = null where e.id = v_old.id;
      insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by) values
        (v_business_id, 'expenses', p_expense_id, 'update', jsonb_build_object('kind', 'revert_correct'), null,
          (select auth.uid())),
        (v_business_id, 'expenses', v_old.id, 'update', jsonb_build_object('kind', 'revert_corrected'), null,
          (select auth.uid()));
      return private.expense_json(v_old.id);
    end if;
  end if;

  -- Un reintento de un «Deshacer» que ya se hizo (la respuesta se perdió): devuelve cómo quedó, sin error
  if v_last.old_data ->> 'kind' = 'revert_void' and v_expense.voided_at is null then
    return private.expense_json(p_expense_id);
  end if;
  if v_last.old_data ->> 'kind' = 'revert_correct' and v_expense.voided_at is not null then
    return private.expense_json(v_expense.replaces_id);
  end if;

  perform private.fail('conflict');
  -- No llega aquí (fail corta); lo pide plpgsql_check
  return null;
end;
$$;

-- Anula un ingreso a mano (queda en el registro); los pagos se corrigen en su pedido
create or replace function private.void_manual_income(p_id uuid, p_reason text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_reason text := btrim(p_reason);
  v_income public.manual_incomes%rowtype;
begin
  if v_reason is null or length(v_reason) not between 1 and 120 then
    perform private.fail('invalid');
  end if;
  select m.* into v_income from public.manual_incomes m where m.business_id = v_business_id and m.id = p_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  -- Anularlo otra vez es un reintento (la respuesta se perdió): devuelve cómo quedó
  if v_income.voided_at is not null then
    return private.manual_income_json(v_income);
  end if;

  update public.manual_incomes m set voided_at = now(), void_reason = v_reason where m.id = p_id
  returning m.* into v_income;
  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'manual_incomes', p_id, 'update', jsonb_build_object('kind', 'void'),
    jsonb_build_object('voidReason', v_reason), (select auth.uid()));
  return private.manual_income_json(v_income);
end;
$$;

