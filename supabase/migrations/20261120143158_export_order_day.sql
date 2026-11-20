-- Lo que se exporta lleva el día de cada fila. Un pedido entra por su día (D11) y así se ve en Excel: con su día y la
-- hora acordada (sin hora, vacía), no con cuándo se anotó. Lo demás, con su día y su hora de Lima
create or replace function public.export_rows(p_from date, p_to date) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_start timestamptz := p_from::timestamp at time zone 'America/Lima';
  v_end timestamptz := (p_to + 1)::timestamp at time zone 'America/Lima';
  v_rows jsonb;
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 365 then
    perform private.fail('invalid');
  end if;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select coalesce(jsonb_agg(x.row order by x.day, x.at nulls first, x.kind, x.id), '[]'::jsonb)
  into v_rows
  from (
    select o.due_date as day, o.promised_at as at, 'order' as kind, o.id, jsonb_build_object(
      'kind', 'order', 'day', o.due_date::text, 'at', private.iso_time(o.promised_at), 'orderNumber', o.number,
      'customerName', o.customer_name, 'detail', o.items_summary, 'method', null::text,
      'amountCents', o.total_cents::integer, 'status', o.status
    ) as row
    from public.orders o
    where o.business_id = v_business_id and o.due_date between p_from and p_to
    union all
    select (p.paid_at at time zone 'America/Lima')::date, p.paid_at,
      (case when p.kind = 'refund' then 'refund' else 'payment' end), p.id, jsonb_build_object(
      'kind', case when p.kind = 'refund' then 'refund' else 'payment' end,
      'day', ((p.paid_at at time zone 'America/Lima')::date)::text, 'at', private.iso_time(p.paid_at),
      'orderNumber', o.number, 'customerName', o.customer_name, 'detail', null::text, 'method', p.method,
      'amountCents', p.amount_cents::integer, 'status', null::text
    )
    from public.payments p
    join public.orders o on o.business_id = p.business_id and o.id = p.order_id
    where p.business_id = v_business_id and p.voided_at is null and p.paid_at >= v_start and p.paid_at < v_end
    union all
    select (e.spent_at at time zone 'America/Lima')::date, e.spent_at, 'expense', e.id, jsonb_build_object(
      'kind', 'expense', 'day', ((e.spent_at at time zone 'America/Lima')::date)::text,
      'at', private.iso_time(e.spent_at), 'orderNumber', null::integer, 'customerName', null::text,
      'detail', c.name || coalesce(': ' || e.description, ''), 'method', e.method, 'amountCents', e.amount_cents::integer,
      'status', null::text
    )
    from public.expenses e
    join public.expense_categories c on c.business_id = e.business_id and c.id = e.category_id
    where e.business_id = v_business_id and e.voided_at is null and e.spent_at >= v_start and e.spent_at < v_end
    union all
    select (m.received_at at time zone 'America/Lima')::date, m.received_at, 'income', m.id, jsonb_build_object(
      'kind', 'income', 'day', ((m.received_at at time zone 'America/Lima')::date)::text,
      'at', private.iso_time(m.received_at), 'orderNumber', null::integer, 'customerName', null::text,
      'detail', m.description, 'method', m.method, 'amountCents', m.amount_cents::integer, 'status', null::text
    )
    from public.manual_incomes m
    where m.business_id = v_business_id and m.voided_at is null and m.received_at >= v_start and m.received_at < v_end
  ) as x;
  return v_rows;
end;
$$;
