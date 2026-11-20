-- Reportes: el periodo anterior lo elige la app (revisión de la fase 6, tarea 3). La semana del lunes 16 al miércoles
-- 18 se compara con la del lunes 9 al miércoles 11, y el 1 al 18 de noviembre con el 1 al 18 de octubre; sin decirlo,
-- siguen siendo los días justo anteriores. La función cambia de argumentos: se reemplaza entera.

drop function public.report_summary(date, date);

-- Un periodo de hasta un año frente al anterior, sus barras y lo cobrado por medio. El anterior tiene el mismo largo y
-- empieza en p_previous_from (la semana o el mes pasado en los mismos días, docs/spec/reports.md §5); sin él, son los
-- días justo anteriores. Las barras van por día hasta 7 días, por semana del periodo hasta 62 y por mes en un rango más largo; la base
-- da el desde, el hasta y los montos, y el texto lo arma la app
create function public.report_summary(p_from date, p_to date, p_previous_from date default null) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_days integer;
  v_previous_from date;
  v_unit text;
  v_start timestamptz := p_from::timestamp at time zone 'America/Lima';
  v_end timestamptz := (p_to + 1)::timestamp at time zone 'America/Lima';
  v_bars jsonb;
  v_by_method jsonb;
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 365 then
    perform private.fail('invalid');
  end if;
  v_days := p_to - p_from + 1;
  v_previous_from := coalesce(p_previous_from, p_from - v_days);
  if v_previous_from + v_days - 1 >= p_from then
    perform private.fail('invalid');
  end if;
  v_unit := case when v_days <= 7 then 'day' when v_days <= 62 then 'week' else 'month' end;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  with buckets as (
    select
      case v_unit when 'month' then greatest(date_trunc('month', g)::date, p_from) else g::date end as b_from,
      case v_unit
        when 'day' then g::date
        when 'week' then least(g::date + 6, p_to)
        else least((date_trunc('month', g) + interval '1 month' - interval '1 day')::date, p_to)
      end as b_to
    from generate_series(
      case v_unit when 'month' then date_trunc('month', p_from::timestamp) else p_from::timestamp end,
      p_to::timestamp,
      case v_unit when 'day' then interval '1 day' when 'week' then interval '7 days' else interval '1 month' end
    ) as g
  ), income as (
    select (r.at at time zone 'America/Lima')::date as day, r.method, r.amount_cents
    from private.income_rows(v_business_id, v_start, v_end) as r
  ), spent as (
    select (e.spent_at at time zone 'America/Lima')::date as day, e.amount_cents
    from public.expenses e
    where e.business_id = v_business_id and e.voided_at is null and e.spent_at >= v_start and e.spent_at < v_end
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'from', b.b_from,
      'to', b.b_to,
      'incomeCents', coalesce((select sum(i.amount_cents) from income i where i.day between b.b_from and b.b_to), 0)::integer,
      'expensesCents', coalesce((select sum(s.amount_cents) from spent s where s.day between b.b_from and b.b_to), 0)::integer
    ) order by b.b_from), '[]'::jsonb),
    jsonb_build_object(
      'cash', coalesce((select sum(i.amount_cents) from income i where i.method = 'cash'), 0)::integer,
      'yape', coalesce((select sum(i.amount_cents) from income i where i.method = 'yape'), 0)::integer,
      'plin', coalesce((select sum(i.amount_cents) from income i where i.method = 'plin'), 0)::integer,
      'transfer', coalesce((select sum(i.amount_cents) from income i where i.method = 'transfer'), 0)::integer
    )
  into v_bars, v_by_method
  from buckets b;

  return private.report_totals(v_business_id, p_from, p_to) || jsonb_build_object(
    'previous', private.report_totals(v_business_id, v_previous_from, v_previous_from + v_days - 1),
    'bars', v_bars,
    'byMethod', v_by_method
  );
end;
$$;

grant execute on function public.report_summary(date, date, date) to authenticated;
