-- Cuadre de caja (docs/spec/cash.md): lo que debería haber en efectivo frente a lo que se contó. Cada conteo queda
-- guardado; el último del día es el que vale. Se lee con reglas de acceso; se escribe solo por funciones.

create table public.cash_counts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  business_date date not null,
  opening_cents public.cents not null constraint cash_counts_opening_max check (opening_cents <= 100000000),
  cash_in_cents public.cents not null,
  cash_out_cents public.cents not null,
  expected_cents integer not null,
  counted_cents public.cents not null constraint cash_counts_counted_max check (counted_cents <= 100000000),
  difference_cents integer not null,
  closed_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_counts_business_id_id_key unique (business_id, id),
  -- Las cuentas también como reglas de la tabla
  constraint cash_counts_expected_sum check (expected_cents = opening_cents + cash_in_cents - cash_out_cents),
  constraint cash_counts_difference check (difference_cents = counted_cents - expected_cents)
);

-- El último cierre del día y el historial
create index cash_counts_business_date_idx on public.cash_counts (business_id, business_date desc, closed_at desc);

alter table public.cash_counts enable row level security;
create trigger set_updated_at before update on public.cash_counts
  for each row execute function private.set_updated_at();
create policy cash_counts_owner_reads on public.cash_counts
  for select to authenticated
  using (business_id = any ((select private.owned_business_ids())::uuid[]));
grant select on public.cash_counts to authenticated;

-- Un cierre como lo ve la app
create function private.cash_count_json(p_count public.cash_counts) returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_count.id,
    'businessDate', p_count.business_date,
    'openingCents', p_count.opening_cents::integer,
    'cashInCents', p_count.cash_in_cents::integer,
    'cashOutCents', p_count.cash_out_cents::integer,
    'expectedCents', p_count.expected_cents,
    'countedCents', p_count.counted_cents::integer,
    'differenceCents', p_count.difference_cents,
    'closedAt', private.iso_time(p_count.closed_at)
  );
$$;

-- Los números de un día de Lima: entra en efectivo (pagos e ingresos a mano), sale en efectivo (gastos y devoluciones),
-- y lo que entró por Yape, Plin y transferencia (menos sus devoluciones). Sin anulados. La usan cash_expected (con las
-- reglas de acceso de quien lee) y close_cash_day
create function private.cash_totals(p_business_id uuid, p_business_date date) returns jsonb
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select p_business_date::timestamp at time zone 'America/Lima' as start_at,
           (p_business_date + 1)::timestamp at time zone 'America/Lima' as end_at
  ), income as (
    select r.* from bounds, private.income_rows(p_business_id, bounds.start_at, bounds.end_at) as r
  ), spent as (
    select coalesce(sum(e.amount_cents), 0)::integer as cents
    from bounds, public.expenses e
    where e.business_id = p_business_id and e.voided_at is null and e.method = 'cash'
      and e.spent_at >= bounds.start_at and e.spent_at < bounds.end_at
  )
  select jsonb_build_object(
    'cashInCents', coalesce((select sum(i.amount_cents) from income i where i.method = 'cash' and i.amount_cents > 0), 0)::integer,
    'cashOutCents', (select s.cents from spent s)
      - coalesce((select sum(i.amount_cents) from income i where i.method = 'cash' and i.amount_cents < 0), 0)::integer,
    'otherMethods', jsonb_build_object(
      'yape', coalesce((select sum(i.amount_cents) from income i where i.method = 'yape'), 0)::integer,
      'plin', coalesce((select sum(i.amount_cents) from income i where i.method = 'plin'), 0)::integer,
      'transfer', coalesce((select sum(i.amount_cents) from income i where i.method = 'transfer'), 0)::integer
    )
  );
$$;

-- Para la pantalla: los números del día y con cuánto abrió el último cierre de un día anterior (el valor por defecto
-- de «Abriste con»). «Debería haber» lo calcula la vista previa mientras se escribe, y la base al cerrar
create function public.cash_expected(p_business_date date) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  if p_business_date is null then
    perform private.fail('invalid');
  end if;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;
  return jsonb_build_object('businessDate', p_business_date)
    || private.cash_totals(v_business_id, p_business_date)
    || jsonb_build_object('lastOpeningCents', coalesce((
      select c.opening_cents::integer from public.cash_counts c
      where c.business_id = v_business_id and c.business_date < p_business_date
      order by c.business_date desc, c.closed_at desc limit 1
    ), 0));
end;
$$;

-- Cierra el día (o vuelve a contar: otro cierre, porque nada se borra), con la cuenta de la base en ese momento.
-- Un día que no llegó no se cierra. Con el mismo código cierra una vez; con otros datos, conflict
create function private.close_cash_day(
  p_request_id uuid, p_business_date date, p_opening_cents integer, p_counted_cents integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_saved jsonb;
  v_totals jsonb;
  v_expected integer;
  v_count public.cash_counts%rowtype;
begin
  v_saved := private.claim_request(v_business_id, p_request_id, 'close_cash_day',
    md5(concat_ws('|', p_business_date, p_opening_cents, p_counted_cents)));
  if v_saved is not null then
    return v_saved;
  end if;

  if p_business_date is null or p_business_date > (now() at time zone 'America/Lima')::date
     or p_opening_cents is null or p_opening_cents not between 0 and 100000000
     or p_counted_cents is null or p_counted_cents not between 0 and 100000000 then
    perform private.fail('invalid');
  end if;

  v_totals := private.cash_totals(v_business_id, p_business_date);
  v_expected := p_opening_cents + (v_totals ->> 'cashInCents')::integer - (v_totals ->> 'cashOutCents')::integer;
  insert into public.cash_counts (business_id, business_date, opening_cents, cash_in_cents, cash_out_cents, expected_cents,
    counted_cents, difference_cents)
  values (v_business_id, p_business_date, p_opening_cents, (v_totals ->> 'cashInCents')::integer,
    (v_totals ->> 'cashOutCents')::integer, v_expected, p_counted_cents, p_counted_cents - v_expected)
  returning * into v_count;
  return private.complete_request(v_business_id, p_request_id, private.cash_count_json(v_count));
end;
$$;

-- El último cierre de ese día (el que vale), o null si no se cerró
create function public.latest_cash_count(p_business_date date) returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.cash_count_json(c)
  from public.cash_counts c
  where c.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1)
    and c.business_date = p_business_date
  order by c.closed_at desc
  limit 1;
$$;

create function public.close_cash_day(
  p_request_id uuid, p_business_date date, p_opening_cents integer, p_counted_cents integer
) returns jsonb
language sql
set search_path = ''
as $$
  select private.close_cash_day(p_request_id, p_business_date, p_opening_cents, p_counted_cents);
$$;

grant execute on function public.cash_expected(date) to authenticated;
grant execute on function public.close_cash_day(uuid, date, integer, integer) to authenticated;
grant execute on function public.latest_cash_count(date) to authenticated;
grant execute on function private.close_cash_day(uuid, date, integer, integer) to authenticated;
-- Las lecturas de arriba la llaman con las reglas de acceso de quien lee
grant execute on function private.cash_totals(uuid, date) to authenticated;
grant execute on function private.cash_count_json(public.cash_counts) to authenticated;
