-- Ingresos (docs/spec/income.md): los pagos de los pedidos por fecha de pago (D11), con las devoluciones en el día en
-- que se devolvieron, más los ingresos que se anotan a mano. Se lee con reglas de acceso; se escribe solo por funciones.

create table public.manual_incomes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  description text not null constraint manual_incomes_description_length
    check (length(description) between 1 and 120 and description = btrim(description)),
  amount_cents public.positive_cents not null constraint manual_incomes_amount_max check (amount_cents <= 10000000),
  method public.payment_method not null,
  received_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text constraint manual_incomes_void_reason_length check (length(btrim(void_reason)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manual_incomes_business_id_id_key unique (business_id, id),
  constraint manual_incomes_void_has_reason check ((voided_at is null) = (void_reason is null))
);

-- La lista (con el id para el cursor) y las sumas por fecha
create index manual_incomes_received_at_idx on public.manual_incomes (business_id, received_at desc, id desc)
  where voided_at is null;

alter table public.manual_incomes enable row level security;
create trigger set_updated_at before update on public.manual_incomes
  for each row execute function private.set_updated_at();
create policy manual_incomes_owner_reads on public.manual_incomes
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));
grant select on public.manual_incomes to authenticated;

-- Un ingreso a mano como lo ve la app
create function private.manual_income_json(p_income public.manual_incomes) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_income.id,
    'description', p_income.description,
    'amountCents', p_income.amount_cents::integer,
    'method', p_income.method,
    'receivedAt', private.iso_time(p_income.received_at),
    'voidedAt', private.iso_time(p_income.voided_at)
  );
$$;

-- Lo que entró entre dos momentos: cada pago sin anular por su fecha de pago (una devolución, en negativo, en el día
-- en que se devolvió) y cada ingreso a mano sin anular. La usan el resumen de ingresos y el cuadre de caja, con las
-- reglas de acceso de quien lee
create function private.income_rows(p_business_id uuid, p_start timestamptz, p_end timestamptz)
returns table (at timestamptz, method public.payment_method, amount_cents integer)
language sql
stable
set search_path = ''
as $$
  select p.paid_at, p.method, (case when p.kind = 'refund' then -p.amount_cents else p.amount_cents end)::integer
  from public.payments p
  where p.business_id = p_business_id and p.voided_at is null and p.paid_at >= p_start and p.paid_at < p_end
  union all
  select m.received_at, m.method, m.amount_cents::integer
  from public.manual_incomes m
  where m.business_id = p_business_id and m.voided_at is null and m.received_at >= p_start and m.received_at < p_end;
$$;

-- Anota un ingreso a mano: hoy (ahora) o ayer (a las 12:00 de Lima), con un medio activo. Con el mismo código devuelve
-- el mismo ingreso; con otros datos, conflict
create function private.create_manual_income(
  p_request_id uuid, p_description text, p_amount_cents integer, p_method text, p_received_on date
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_description text := btrim(p_description);
  v_today date := (now() at time zone 'America/Lima')::date;
  v_income public.manual_incomes%rowtype;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'create_manual_income',
    md5(concat_ws('|', p_description, p_amount_cents, p_method, p_received_on)));
  if v_saved is not null then
    return v_saved;
  end if;

  if v_description is null or length(v_description) not between 1 and 120
     or p_amount_cents is null or p_amount_cents not between 1 and 10000000
     or (p_received_on is not null and p_received_on not in (v_today, v_today - 1))
     or p_method is null or not exists (
       select 1 from public.business_settings s
       where s.business_id = v_business_id and p_method = any (s.active_payment_methods::text[])
     ) then
    perform private.fail('invalid');
  end if;

  insert into public.manual_incomes (business_id, description, amount_cents, method, received_at)
  values (v_business_id, v_description, p_amount_cents, p_method::public.payment_method,
    case when p_received_on is null or p_received_on = v_today then now()
      else (p_received_on + time '12:00') at time zone 'America/Lima' end)
  returning * into v_income;
  return private.complete_request(v_business_id, p_request_id, private.manual_income_json(v_income));
end;
$$;

-- Anula un ingreso a mano (queda en el registro); los pagos se corrigen en su pedido
create function private.void_manual_income(p_id uuid, p_reason text) returns jsonb
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
  if v_income.voided_at is not null then
    perform private.fail('invalid');
  end if;

  update public.manual_incomes m set voided_at = now(), void_reason = v_reason where m.id = p_id
  returning m.* into v_income;
  insert into private.audit_log (business_id, table_name, row_id, action, old_data, new_data, changed_by)
  values (v_business_id, 'manual_incomes', p_id, 'update', jsonb_build_object('kind', 'void'),
    jsonb_build_object('voidReason', v_reason), (select auth.uid()));
  return private.manual_income_json(v_income);
end;
$$;

-- El total, por medio de pago y por día de Lima, entre dos días (incluidos). Lo usan Ingresos y, después, Inicio y
-- Reportes
create function public.income_summary(p_from date, p_to date) returns jsonb
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

  with rows as (
    select r.* from private.income_rows(v_business_id, p_from::timestamp at time zone 'America/Lima',
      (p_to + 1)::timestamp at time zone 'America/Lima') as r
  )
  select jsonb_build_object(
    'totalCents', coalesce((select sum(r.amount_cents) from rows r), 0)::integer,
    'byMethod', jsonb_build_object(
      'cash', coalesce((select sum(r.amount_cents) from rows r where r.method = 'cash'), 0)::integer,
      'yape', coalesce((select sum(r.amount_cents) from rows r where r.method = 'yape'), 0)::integer,
      'plin', coalesce((select sum(r.amount_cents) from rows r where r.method = 'plin'), 0)::integer,
      'transfer', coalesce((select sum(r.amount_cents) from rows r where r.method = 'transfer'), 0)::integer
    ),
    'byDay', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'totalCents', d.total) order by d.day)
      from (
        select (r.at at time zone 'America/Lima')::date as day, sum(r.amount_cents)::integer as total
        from rows r group by 1
      ) as d
    ), '[]'::jsonb)
  )
  into v_result;
  return v_result;
end;
$$;

-- Los pagos (y las devoluciones) con su pedido y los ingresos a mano, sin anulados, del más nuevo al más viejo, por
-- días de Lima (opcionales) y por páginas. Cada parte se pide ya ordenada por su índice y se juntan. El cursor es
-- opaco: la fecha (en UTC, con microsegundos) y el id del último, en base64
create function public.list_income(
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

  select (
    select count(*) from public.payments p
    where p.business_id = v_business_id and p.voided_at is null
      and (v_start is null or p.paid_at >= v_start) and (v_end is null or p.paid_at < v_end)
  ) + (
    select count(*) from public.manual_incomes m
    where m.business_id = v_business_id and m.voided_at is null
      and (v_start is null or m.received_at >= v_start) and (v_end is null or m.received_at < v_end)
  ) into v_total;

  select coalesce(jsonb_agg(jsonb_build_object(
      'kind', page.kind,
      'id', page.id,
      'at', private.iso_time(page.at),
      'amountCents', page.amount_cents,
      'method', page.method,
      'orderId', page.order_id,
      'orderNumber', page.order_number,
      'customerName', page.customer_name,
      'description', page.description,
      'cursorAt', to_char(page.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    ) order by page.at desc, page.id desc), '[]'::jsonb), count(*)::integer
  into v_page, v_rows
  from (
    select x.* from (
      (
        select (case when p.kind = 'refund' then 'refund' else 'payment' end) as kind, p.id, p.paid_at as at,
          p.amount_cents::integer as amount_cents, p.method, p.order_id, o.number as order_number,
          o.customer_name, null::text as description
        from public.payments p
        join public.orders o on o.business_id = p.business_id and o.id = p.order_id
        where p.business_id = v_business_id and p.voided_at is null
          and (v_start is null or p.paid_at >= v_start) and (v_end is null or p.paid_at < v_end)
          and (v_after_at is null or (p.paid_at, p.id) < (v_after_at, v_after_id))
        order by p.paid_at desc, p.id desc
        limit v_limit + 1
      )
      union all
      (
        select 'manual', m.id, m.received_at, m.amount_cents::integer, m.method, null::uuid, null::integer, null::text,
          m.description
        from public.manual_incomes m
        where m.business_id = v_business_id and m.voided_at is null
          and (v_start is null or m.received_at >= v_start) and (v_end is null or m.received_at < v_end)
          and (v_after_at is null or (m.received_at, m.id) < (v_after_at, v_after_id))
        order by m.received_at desc, m.id desc
        limit v_limit + 1
      )
    ) as x
    order by x.at desc, x.id desc
    limit v_limit + 1
  ) as page;

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

create function public.create_manual_income(
  p_request_id uuid, p_description text, p_amount_cents integer, p_method text, p_received_on date
) returns jsonb
language sql
set search_path = ''
as $$
  select private.create_manual_income(p_request_id, p_description, p_amount_cents, p_method, p_received_on);
$$;

create function public.void_manual_income(p_id uuid, p_reason text) returns jsonb
language sql
set search_path = ''
as $$
  select private.void_manual_income(p_id, p_reason);
$$;

grant execute on function public.create_manual_income(uuid, text, integer, text, date) to authenticated;
grant execute on function public.void_manual_income(uuid, text) to authenticated;
grant execute on function public.income_summary(date, date) to authenticated;
grant execute on function public.list_income(date, date, integer, text) to authenticated;
grant execute on function private.create_manual_income(uuid, text, integer, text, date) to authenticated;
grant execute on function private.void_manual_income(uuid, text) to authenticated;
-- El resumen (y el cuadre) la llaman con las reglas de acceso de quien lee
grant execute on function private.income_rows(uuid, timestamptz, timestamptz) to authenticated;
