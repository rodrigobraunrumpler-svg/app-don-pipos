-- Gastos: corregir, anular y su «Deshacer», la lista y el resumen por tipo (docs/spec/expenses.md §3). Nada se borra:
-- corregir anula el viejo y crea el nuevo; cada cambio queda en private.audit_log, que es lo que lee «Deshacer».

-- Corrige monto, tipo, medio y descripción: anula el viejo («corrección») y crea el nuevo con replaces_id, la misma
-- fecha y la misma boleta. El tipo y el medio tienen que estar activos, salvo que sean los mismos de antes
create function private.correct_expense(
  p_request_id uuid, p_id uuid, p_category_id uuid, p_amount_cents integer, p_method text, p_description text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_description text := nullif(btrim(p_description), '');
  v_old public.expenses%rowtype;
  v_new uuid;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'correct_expense',
    md5(concat_ws('|', p_id, p_category_id, p_amount_cents, p_method, p_description)));
  if v_saved is not null then
    return v_saved;
  end if;

  select e.* into v_old from public.expenses e where e.business_id = v_business_id and e.id = p_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_old.voided_at is not null or p_amount_cents is null or p_amount_cents not between 1 and 10000000
     or length(v_description) > 120 or p_method is null
     or (p_category_id is distinct from v_old.category_id and not exists (
       select 1 from public.expense_categories c where c.business_id = v_business_id and c.id = p_category_id and c.is_active
     ))
     or (p_method is distinct from v_old.method::text and not exists (
       select 1 from public.business_settings s
       where s.business_id = v_business_id and p_method = any (s.active_payment_methods::text[])
     ))
     or (p_category_id = v_old.category_id and p_amount_cents = v_old.amount_cents and p_method = v_old.method::text
       and v_description is not distinct from v_old.description) then
    perform private.fail('invalid');
  end if;

  update public.expenses e set voided_at = now(), void_reason = 'corrección' where e.id = p_id;
  insert into public.expenses (business_id, category_id, description, amount_cents, method, spent_at, receipt_path, replaces_id)
  values (v_business_id, p_category_id, v_description, p_amount_cents, p_method::public.payment_method, v_old.spent_at,
    v_old.receipt_path, p_id)
  returning id into v_new;

  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by) values
    (v_business_id, 'expenses', p_id, 'update', jsonb_build_object('kind', 'corrected'), jsonb_build_object('newId', v_new),
      (select auth.uid())),
    (v_business_id, 'expenses', v_new, 'insert', jsonb_build_object('kind', 'correct', 'replacesId', p_id), null,
      (select auth.uid()));

  return private.complete_request(v_business_id, p_request_id, private.expense_json(v_new));
end;
$$;

-- Anula un gasto: deja de contar en todos los totales. Anular dos veces es invalid
create function private.void_expense(p_id uuid, p_reason text) returns jsonb
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
create function private.revert_expense_change(p_expense_id uuid) returns jsonb
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

  perform private.fail('conflict');
  -- No llega aquí (fail corta); lo pide plpgsql_check
  return null;
end;
$$;

-- Los gastos que cuentan (sin anular), del más nuevo al más viejo, por días de Lima (los dos opcionales) y por
-- páginas. El cursor es opaco: la fecha (en UTC, con microsegundos) y el id del último, en base64
create function public.list_expenses(
  p_from date default null, p_to date default null, p_limit integer default 20, p_cursor text default null
) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_limit integer := coalesce(p_limit, 20);
  v_start timestamptz := (p_from::timestamp at time zone 'America/Lima');
  v_end timestamptz := ((p_to + 1)::timestamp at time zone 'America/Lima');
  v_after_at timestamptz;
  v_after_id uuid;
  v_total integer;
  v_page jsonb;
  v_rows integer;
  v_last jsonb;
begin
  if v_limit < 1 or p_from > p_to then
    perform private.fail('invalid');
  end if;
  v_limit := least(v_limit, 50);
  if p_cursor is not null then
    begin
      select split_part(t.value, '|', 1)::timestamptz, split_part(t.value, '|', 2)::uuid
      into v_after_at, v_after_id
      from convert_from(decode(p_cursor, 'base64'), 'UTF8') as t (value);
    exception when others then
      perform private.fail('invalid');
    end;
  end if;

  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select count(*)::integer into v_total
  from public.expenses e
  where e.business_id = v_business_id and e.voided_at is null
    and (v_start is null or e.spent_at >= v_start) and (v_end is null or e.spent_at < v_end);

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', page.id,
      'categoryId', page.category_id,
      'categoryName', c.name,
      'categoryIcon', c.icon,
      'description', page.description,
      'amountCents', page.amount_cents::integer,
      'method', page.method,
      'spentAt', private.iso_time(page.spent_at),
      'receiptPath', page.receipt_path,
      'previousAmountCents', r.amount_cents::integer,
      'voidedAt', null,
      'cursorAt', to_char(page.spent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    ) order by page.spent_at desc, page.id desc), '[]'::jsonb), count(*)::integer
  into v_page, v_rows
  from (
    select e.id, e.category_id, e.description, e.amount_cents, e.method, e.spent_at, e.receipt_path, e.replaces_id
    from public.expenses e
    where e.business_id = v_business_id and e.voided_at is null
      and (v_start is null or e.spent_at >= v_start) and (v_end is null or e.spent_at < v_end)
      and (v_after_at is null or (e.spent_at, e.id) < (v_after_at, v_after_id))
    order by e.spent_at desc, e.id desc
    limit v_limit + 1
  ) as page
  join public.expense_categories c on c.business_id = v_business_id and c.id = page.category_id
  left join public.expenses r on r.business_id = v_business_id and r.id = page.replaces_id;

  -- Se pidió uno de más: si llegó, hay otra página
  if v_rows > v_limit then
    v_page := v_page - v_limit;
    v_last := v_page -> (v_limit - 1);
  end if;

  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(e.value - 'cursorAt' order by e.position) from jsonb_array_elements(v_page) with ordinality as e (value, position)
    ), '[]'::jsonb),
    'meta', jsonb_build_object(
      'limit', v_limit,
      'total', v_total,
      'hasMore', v_rows > v_limit,
      'nextCursor', case when v_rows > v_limit then replace(encode(convert_to(
        (v_last ->> 'cursorAt') || '|' || (v_last ->> 'id'), 'UTF8'), 'base64'), E'\n', '') end
    )
  );
end;
$$;

-- «Gastado en noviembre»: el total y lo gastado por tipo, de mayor a menor, sin anulados, por días de Lima
create function public.expenses_summary(p_from date, p_to date) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_from > p_to then
    perform private.fail('invalid');
  end if;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select jsonb_build_object(
    'totalCents', coalesce(sum(t.total), 0)::integer,
    'byCategory', coalesce(jsonb_agg(jsonb_build_object(
      'categoryId', c.id, 'name', c.name, 'icon', c.icon, 'totalCents', t.total
    ) order by t.total desc, lower(c.name)), '[]'::jsonb)
  )
  into v_result
  from (
    select e.category_id, sum(e.amount_cents)::integer as total
    from public.expenses e
    where e.business_id = v_business_id and e.voided_at is null
      and e.spent_at >= (p_from::timestamp at time zone 'America/Lima')
      and e.spent_at < ((p_to + 1)::timestamp at time zone 'America/Lima')
    group by e.category_id
  ) as t
  join public.expense_categories c on c.business_id = v_business_id and c.id = t.category_id;
  return v_result;
end;
$$;

create function public.correct_expense(
  p_request_id uuid, p_id uuid, p_category_id uuid, p_amount_cents integer, p_method text, p_description text
) returns jsonb
language sql
set search_path = ''
as $$
  select private.correct_expense(p_request_id, p_id, p_category_id, p_amount_cents, p_method, p_description);
$$;

create function public.void_expense(p_id uuid, p_reason text) returns jsonb
language sql
set search_path = ''
as $$
  select private.void_expense(p_id, p_reason);
$$;

create function public.revert_expense_change(p_expense_id uuid) returns jsonb
language sql
set search_path = ''
as $$
  select private.revert_expense_change(p_expense_id);
$$;

grant execute on function public.correct_expense(uuid, uuid, uuid, integer, text, text) to authenticated;
grant execute on function public.void_expense(uuid, text) to authenticated;
grant execute on function public.revert_expense_change(uuid) to authenticated;
grant execute on function public.list_expenses(date, date, integer, text) to authenticated;
grant execute on function public.expenses_summary(date, date) to authenticated;
grant execute on function private.correct_expense(uuid, uuid, uuid, integer, text, text) to authenticated;
grant execute on function private.void_expense(uuid, text) to authenticated;
grant execute on function private.revert_expense_change(uuid) to authenticated;
